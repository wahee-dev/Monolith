import type { LatticeState, LatticeNode, LatticeNodeId, LatticeConnection } from '@lattice/types';
import type { LawResult } from '@law/types';
import type { PortType } from '@engine/types';
import type { NodeView, EdgeView, MeshView, FieldView, TypeStatus, PortView } from './types';
import { getPortTypeColor } from './types';
import { computeLayout } from './layout';
import { computeBezierPath, computeBounds } from './geometry';
import { renderStringField } from './renderers/string';
import { renderNumberField } from './renderers/number';
import { renderBooleanField } from './renderers/boolean';
import { renderObjectField } from './renderers/object';
import { renderArrayField } from './renderers/array';
import { NODE_BASE_HEIGHT, FIELD_HEIGHT } from './layout';
import { getNodeTypeDefinition } from '@engine/registry';

const KIND_COLORS: Record<string, string> = {
  source: '#4a9eff',
  transform: '#ff9f4a',
  sink: '#4aff9f',
  gate: '#ff4a9f',
  merge: '#9f4aff',
  split: '#9fff4a',
};

const KIND_LABELS: Record<string, string> = {
  source: 'Source',
  transform: 'Transform',
  sink: 'Sink',
  gate: 'Gate',
  merge: 'Merge',
  split: 'Split',
};

const PORT_SPACING = 22;
const HEADER_HEIGHT = 28;
const MIN_PORT_SPACING = 20;

function renderFieldByType(type: FieldView['type'], value: unknown): string {
  switch (type) {
    case 'string':
      return renderStringField(value);
    case 'number':
      return renderNumberField(value);
    case 'boolean':
      return renderBooleanField(value);
    case 'object':
      return renderObjectField(value);
    case 'array':
      return renderArrayField(value);
    default:
      return String(value);
  }
}

function getPortTypeFromSchema(
  node: LatticeNode,
  portName: string,
  direction: 'input' | 'output',
): PortType {
  const regResult = getNodeTypeDefinition(node.kind);
  if (regResult.ok) {
    const ports = direction === 'input' ? regResult.value.inputs : regResult.value.outputs;
    for (let i = 0; i < ports.length; i++) {
      if (ports[i]!.name === portName) {
        return ports[i]!.type;
      }
    }
  }
  const schemaPorts = direction === 'input' ? node.schema.input : node.schema.output;
  const field = schemaPorts[portName];
  if (field !== undefined) {
    const t = field.type;
    if (t === 'string' || t === 'number' || t === 'boolean' || t === 'object' || t === 'array') {
      return t;
    }
  }
  return 'any';
}

function buildNodePorts(
  node: LatticeNode,
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  connections: ReadonlyArray<{ readonly from: string; readonly to: string; readonly fromPort: string; readonly toPort: string }>,
): ReadonlyArray<PortView> {
  const ports: PortView[] = [];
  const nodeId = node.id as string;

  const isInputConnected = (portName: string): boolean =>
    connections.some((c) => c.to === nodeId && c.toPort === portName);
  const isOutputConnected = (portName: string): boolean =>
    connections.some((c) => c.from === nodeId && c.fromPort === portName);

  const inputKeys = Object.keys(node.schema.input).sort();
  const inputCount = inputKeys.length;
  const spacing = Math.max(PORT_SPACING, MIN_PORT_SPACING);
  const fieldAreaHeight = rect.height - HEADER_HEIGHT;
  const inputStartY = inputCount === 1
    ? rect.y + HEADER_HEIGHT + fieldAreaHeight / 2
    : rect.y + HEADER_HEIGHT + fieldAreaHeight / 2 - ((inputCount - 1) * spacing) / 2;

  for (let i = 0; i < inputKeys.length; i++) {
    const key = inputKeys[i]!;
    ports.push({
      name: key,
      type: getPortTypeFromSchema(node, key, 'input'),
      direction: 'input',
      position: { x: rect.x, y: inputStartY + i * spacing },
      isConnected: isInputConnected(key),
    });
  }

  const outputKeys = Object.keys(node.schema.output).sort();
  const outputCount = outputKeys.length;
  const outputStartY = outputCount === 1
    ? rect.y + HEADER_HEIGHT + fieldAreaHeight / 2
    : rect.y + HEADER_HEIGHT + fieldAreaHeight / 2 - ((outputCount - 1) * spacing) / 2;

  for (let i = 0; i < outputKeys.length; i++) {
    const key = outputKeys[i]!;
    ports.push({
      name: key,
      type: getPortTypeFromSchema(node, key, 'output'),
      direction: 'output',
      position: { x: rect.x + rect.width, y: outputStartY + i * spacing },
      isConnected: isOutputConnected(key),
    });
  }
  return ports;
}

function buildNodeFields(
  node: LatticeNode,
  nodeValue: unknown,
  rect: { readonly x: number; readonly y: number },
): ReadonlyArray<FieldView> {
  const fields: FieldView[] = [];
  let yOffset = NODE_BASE_HEIGHT - 8;

  const inputKeys = Object.keys(node.schema.input).sort();
  for (let i = 0; i < inputKeys.length; i++) {
    const key = inputKeys[i]!;
    const schemaField = node.schema.input[key]!;
    const value = typeof nodeValue === 'object' && nodeValue !== null
      ? (nodeValue as Record<string, unknown>)[key]
      : undefined;
    fields.push({
      name: schemaField.name,
      type: schemaField.type,
      value: renderFieldByType(schemaField.type, value),
      position: { x: rect.x + 12, y: rect.y + yOffset },
    });
    yOffset += FIELD_HEIGHT;
  }

  const outputKeys = Object.keys(node.schema.output).sort();
  for (let i = 0; i < outputKeys.length; i++) {
    const key = outputKeys[i]!;
    const schemaField = node.schema.output[key]!;
    const value = typeof nodeValue === 'object' && nodeValue !== null
      ? (nodeValue as Record<string, unknown>)[key]
      : undefined;
    fields.push({
      name: schemaField.name,
      type: schemaField.type,
      value: renderFieldByType(schemaField.type, value),
      position: { x: rect.x + 12, y: rect.y + yOffset },
    });
    yOffset += FIELD_HEIGHT;
  }

  return fields;
}

function buildNodeViews(
  state: LatticeState,
  nodes: ReadonlyMap<LatticeNodeId, LatticeNode>,
  connections: ReadonlyArray<LatticeConnection>,
  layoutMap: ReadonlyMap<string, { readonly x: number; readonly y: number; readonly width: number; readonly height: number }>,
  expressions: ReadonlyMap<string, string>,
  typeStatusMap: ReadonlyMap<string, TypeStatus>,
  typeErrors: ReadonlyMap<string, string>,
): ReadonlyArray<NodeView> {
  const views: NodeView[] = [];
  const nodeEntries = Array.from(nodes.entries()).sort(
    (a, b) => (a[0] as string).localeCompare(b[0] as string),
  );

  const kindCounters = new Map<string, number>();
  for (const [, node] of nodeEntries) {
    const current = kindCounters.get(node.kind) ?? 0;
    kindCounters.set(node.kind, current + 1);
  }

  const kindRunningCounters = new Map<string, number>();
  const connectionData = connections.map((c: any) => ({
    from: c.from as string,
    to: c.to as string,
    fromPort: c.fromPort,
    toPort: c.toPort,
  }));

  for (let i = 0; i < nodeEntries.length; i++) {
    const [nodeId, node] = nodeEntries[i]!;
    const id = nodeId as string;
    const rect = layoutMap.get(id);
    if (rect === undefined) continue;

    const nodeValue = state.values.get(nodeId);
    const fields = buildNodeFields(node, nodeValue, rect);
    const ports = buildNodePorts(node, rect, connectionData);
    const color = KIND_COLORS[node.kind] ?? '#888888';
    const runningCount = (kindRunningCounters.get(node.kind) ?? 0) + 1;
    kindRunningCounters.set(node.kind, runningCount);
    const kindLabel = KIND_LABELS[node.kind] ?? node.kind;
    const totalCount = kindCounters.get(node.kind) ?? 1;
    const label = totalCount > 1
      ? `${kindLabel} #${runningCount}`
      : kindLabel;

    views.push({
      id,
      rect,
      kind: node.kind,
      label,
      fields,
      ports,
      color,
      expression: expressions.get(id) ?? '',
      typeStatus: typeStatusMap.get(id) ?? ('unchecked' as const),
      typeError: typeErrors.get(id) ?? '',
    });
  }

  return views;
}

function getPortTypeFromNodeView(
  nodeView: NodeView,
  portName: string,
  direction: 'input' | 'output',
): PortType {
  for (let i = 0; i < nodeView.ports.length; i++) {
    const port = nodeView.ports[i]!;
    if (port.name === portName && port.direction === direction) {
      return port.type;
    }
  }
  return 'any';
}

function buildEdgeViews(
  connections: ReadonlyArray<LatticeConnection>,
  nodeViews: ReadonlyArray<NodeView>,
): ReadonlyArray<EdgeView> {
  const edges: EdgeView[] = [];
  const viewMap = new Map<string, NodeView>();
  for (let i = 0; i < nodeViews.length; i++) {
    const view = nodeViews[i]!;
    viewMap.set(view.id, view);
  }

  const sortedConnections = [...connections].sort(
    (a, b) => a.id.localeCompare(b.id),
  );

  for (let i = 0; i < sortedConnections.length; i++) {
    const conn = sortedConnections[i]!;
    const fromView = viewMap.get(conn.from as string);
    const toView = viewMap.get(conn.to as string);

    if (fromView === undefined || toView === undefined) continue;

    const curve = computeBezierPath(fromView.rect, toView.rect);
    const portType = getPortTypeFromNodeView(fromView, conn.fromPort, 'output');
    const edgeColor = getPortTypeColor(portType);

    edges.push({
      id: conn.id,
      fromNodeId: conn.from as string,
      toNodeId: conn.to as string,
      curve,
      label: `${conn.fromPort} → ${conn.toPort}`,
      color: edgeColor,
      portType,
    });
  }

  return edges;
}

export function projectMesh(
  state: LatticeState,
  expressions?: ReadonlyMap<string, string>,
  typeStatusMap?: ReadonlyMap<string, TypeStatus>,
  typeErrors?: ReadonlyMap<string, string>,
): LawResult<MeshView> {
  const exprMap = expressions ?? new Map<string, string>();
  const statusMap = typeStatusMap ?? new Map<string, TypeStatus>();
  const errorMap = typeErrors ?? new Map<string, string>();
  const activeScene = state.scenes.get(state.activeSceneId)!;

  const nodeList = Array.from(activeScene.nodes.values());
  const layoutRects = computeLayout(nodeList, activeScene.connections);

  const layoutMap = new Map<string, { readonly x: number; readonly y: number; readonly width: number; readonly height: number }>();
  const entries = Array.from(layoutRects.entries());
  for (let i = 0; i < entries.length; i++) {
    const [nodeId, rect] = entries[i]!;
    layoutMap.set(nodeId as string, rect);
  }

  const nodes = buildNodeViews(state, activeScene.nodes, activeScene.connections, layoutMap, exprMap, statusMap, errorMap);
  const edges = buildEdgeViews(activeScene.connections, nodes);
  const bounds = computeBounds(nodes);

  return {
    ok: true,
    value: { nodes, edges, bounds },
  };
}
