import type { LawResult } from '@law/types';
import type {
  PortType,
  PortDefinition,
  ConnectionValidation,
  GraphValidation,
  GraphValidationError,
  GraphValidationWarning,
} from './types';

const COERCIBLE_TO_STRING: ReadonlySet<PortType> = new Set<PortType>([
  'number',
  'boolean',
  'object',
]);

export function canConnectTypes(from: PortType, to: PortType): boolean {
  if (from === 'void' || to === 'void') {
    return false;
  }
  if (from === 'any' || to === 'any') {
    return true;
  }
  if (from === to) {
    return true;
  }
  if (to === 'string' && COERCIBLE_TO_STRING.has(from)) {
    return true;
  }
  return false;
}

export function validateConnection(
  fromPort: PortDefinition,
  toPort: PortDefinition,
): ConnectionValidation {
  if (fromPort.name === toPort.name && fromPort.type === toPort.type) {
    return {
      isValid: false,
      error: 'Cannot connect a port to itself',
    };
  }
  if (!canConnectTypes(fromPort.type, toPort.type)) {
    return {
      isValid: false,
      error: `Type mismatch: cannot connect ${fromPort.type} output to ${toPort.type} input`,
    };
  }
  return { isValid: true, error: '' };
}

export function detectCycles(
  connections: ReadonlyArray<{ readonly from: string; readonly to: string }>,
): LawResult<ReadonlyArray<string>> {
  const adj = new Map<string, ReadonlyArray<string>>();
  const allNodes = new Set<string>();

  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i]!;
    allNodes.add(conn.from);
    allNodes.add(conn.to);
    const existing = adj.get(conn.from);
    if (existing === undefined) {
      adj.set(conn.from, [conn.to]);
    } else {
      adj.set(conn.from, [...existing, conn.to]);
    }
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;

  const color = new Map<string, number>();
  const parent = new Map<string, string>();

  for (const node of allNodes) {
    color.set(node, WHITE);
  }

  const cyclePath: string[] = [];

  function dfs(node: string): boolean {
    color.set(node, GRAY);
    const neighbors = adj.get(node);
    if (neighbors !== undefined) {
      for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i]!;
        const neighborColor = color.get(neighbor);
        if (neighborColor === GRAY) {
          const path: string[] = [neighbor];
          let current: string = node;
          while (current !== neighbor) {
            path.push(current);
            const p = parent.get(current);
            if (p === undefined) break;
            current = p;
          }
          path.push(neighbor);
          path.reverse();
          cyclePath.push(...path);
          return true;
        }
        if (neighborColor === WHITE) {
          parent.set(neighbor, node);
          if (dfs(neighbor)) {
            return true;
          }
        }
      }
    }
    color.set(node, BLACK);
    return false;
  }

  for (const node of allNodes) {
    if (color.get(node) === WHITE) {
      if (dfs(node)) {
        return { ok: true, value: cyclePath };
      }
    }
  }

  return { ok: true, value: [] };
}

export function findOrphanNodes(
  nodeIds: ReadonlyArray<string>,
  connections: ReadonlyArray<{ readonly from: string; readonly to: string }>,
): ReadonlyArray<string> {
  const connected = new Set<string>();
  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i]!;
    connected.add(conn.from);
    connected.add(conn.to);
  }
  const orphans: string[] = [];
  for (let i = 0; i < nodeIds.length; i++) {
    const id = nodeIds[i]!;
    if (!connected.has(id)) {
      orphans.push(id);
    }
  }
  return orphans;
}

export function findMissingInputs(
  nodes: ReadonlyMap<string, { readonly inputs: ReadonlyArray<PortDefinition> }>,
  connections: ReadonlyArray<{ readonly to: string; readonly toPort: string }>,
): ReadonlyArray<{ readonly nodeId: string; readonly portName: string }> {
  const incomingByNode = new Map<string, Set<string>>();
  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i]!;
    const existing = incomingByNode.get(conn.to);
    if (existing === undefined) {
      incomingByNode.set(conn.to, new Set<string>([conn.toPort]));
    } else {
      existing.add(conn.toPort);
    }
  }

  const missing: { readonly nodeId: string; readonly portName: string }[] = [];

  for (const [nodeId, def] of nodes) {
    const incoming = incomingByNode.get(nodeId);
    for (let i = 0; i < def.inputs.length; i++) {
      const port = def.inputs[i]!;
      if (port.required) {
        if (incoming === undefined || !incoming.has(port.name)) {
          missing.push({ nodeId, portName: port.name });
        }
      }
    }
  }

  return missing;
}

interface NodeLike {
  readonly kind: string;
  readonly inputs: ReadonlyArray<PortDefinition>;
  readonly outputs: ReadonlyArray<PortDefinition>;
}

interface ConnectionLike {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly fromPort: string;
  readonly toPort: string;
}

export function validateGraph(
  nodes: ReadonlyMap<string, NodeLike>,
  connections: ReadonlyArray<ConnectionLike>,
): GraphValidation {
  const errors: GraphValidationError[] = [];
  const warnings: GraphValidationWarning[] = [];

  const nodeIds: string[] = [];
  for (const key of nodes.keys()) {
    nodeIds.push(key);
  }

  const simpleConnections = connections.map(
    (c): { readonly from: string; readonly to: string } => ({
      from: c.from,
      to: c.to,
    }),
  );

  const cycleResult = detectCycles(simpleConnections);
  if (cycleResult.ok && cycleResult.value.length > 0) {
    errors.push({
      kind: 'cycle',
      message: `Graph contains a cycle: ${cycleResult.value.join(' → ')}`,
    });
  }

  const orphans = findOrphanNodes(nodeIds, simpleConnections);
  for (let i = 0; i < orphans.length; i++) {
    const orphanId = orphans[i]!;
    const node = nodes.get(orphanId);
    if (node !== undefined && node.inputs.length === 0 && node.outputs.length === 0) {
      warnings.push({
        kind: 'disconnected',
        nodeId: orphanId,
        message: `Node '${orphanId}' is disconnected from the graph`,
      });
    } else {
      errors.push({
        kind: 'orphan',
        nodeId: orphanId,
        message: `Node '${orphanId}' has no connections`,
      });
    }
  }

  const missingInputs = findMissingInputs(nodes, connections);
  for (let i = 0; i < missingInputs.length; i++) {
    const missing = missingInputs[i]!;
    errors.push({
      kind: 'missing_input',
      nodeId: missing.nodeId,
      message: `Node '${missing.nodeId}' is missing required input '${missing.portName}'`,
    });
  }

  const seenConnections = new Map<string, Set<string>>();
  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i]!;
    const key = `${conn.to}::${conn.toPort}`;
    const existing = seenConnections.get(key);
    if (existing !== undefined && existing.has(`${conn.from}::${conn.fromPort}`)) {
      errors.push({
        kind: 'duplicate_connection',
        connectionId: conn.id,
        message: `Duplicate connection from '${conn.from}.${conn.fromPort}' to '${conn.to}.${conn.toPort}'`,
      });
    } else if (existing === undefined) {
      seenConnections.set(key, new Set<string>([`${conn.from}::${conn.fromPort}`]));
    } else {
      existing.add(`${conn.from}::${conn.fromPort}`);
    }

    const fromNode = nodes.get(conn.from);
    const toNode = nodes.get(conn.to);
    if (fromNode !== undefined && toNode !== undefined) {
      const fromPort = fromNode.outputs.find((p) => p.name === conn.fromPort);
      const toPort = toNode.inputs.find((p) => p.name === conn.toPort);
      if (fromPort !== undefined && toPort !== undefined) {
        if (!canConnectTypes(fromPort.type, toPort.type)) {
          errors.push({
            kind: 'type_mismatch',
            connectionId: conn.id,
            nodeId: conn.to,
            message: `Type mismatch at connection '${conn.id}': cannot connect ${fromPort.type} to ${toPort.type}`,
          });
        }
      }
    }
  }

  const connectedOutputPorts = new Set<string>();
  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i]!;
    connectedOutputPorts.add(`${conn.from}::${conn.fromPort}`);
  }
  for (const [nodeId, node] of nodes) {
    for (let i = 0; i < node.outputs.length; i++) {
      const outPort = node.outputs[i]!;
      if (!connectedOutputPorts.has(`${nodeId}::${outPort.name}`)) {
        warnings.push({
          kind: 'unused_output',
          nodeId,
          message: `Node '${nodeId}' has unused output '${outPort.name}'`,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
