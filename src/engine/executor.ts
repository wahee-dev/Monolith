import type { LawResult } from '@law/types';
import type { LatticeState, LatticeNode } from '@lattice/types';
import { createLatticeNodeId } from '@lattice/types';
import type { Environment } from '@lattice/expression/evaluator';
import type {
  ExecutionTrace,
  GraphExecutionResult,
  PortType,
  PortDefinition,
} from './types';
import { validateGraph } from './validator';
import { executeNode } from '@lattice/nodes';
import { parseAndTypeCheck, evaluate } from '@lattice/expression';
import { isJSHybrid, evaluateJS } from './index';

function inferPortType(value: unknown): PortType {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'any';
}

function latticeNodeToNodeLike(
  node: LatticeNode,
): {
  readonly kind: string;
  readonly inputs: ReadonlyArray<PortDefinition>;
  readonly outputs: ReadonlyArray<PortDefinition>;
} {
  const inputEntries = Object.values(node.schema.input);
  const outputEntries = Object.values(node.schema.output);
  return {
    kind: node.kind,
    inputs: inputEntries.map(
      (field): PortDefinition => ({
        name: field.name,
        type: field.type,
        label: field.name,
        required: field.required,
      }),
    ),
    outputs: outputEntries.map(
      (field): PortDefinition => ({
        name: field.name,
        type: field.type,
        label: field.name,
        required: field.required,
      }),
    ),
  };
}

export function topologicalSort(
  nodeIds: ReadonlyArray<string>,
  connections: ReadonlyArray<
    { readonly from: string; readonly to: string }
  >,
): LawResult<ReadonlyArray<string>> {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (let i = 0; i < nodeIds.length; i++) {
    const id = nodeIds[i]!;
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i]!;
    const neighbors = adjacency.get(conn.from);
    if (neighbors !== undefined) {
      neighbors.push(conn.to);
    }
    const current = inDegree.get(conn.to);
    if (current !== undefined) {
      inDegree.set(conn.to, current + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    const nbrs = adjacency.get(current);
    if (nbrs !== undefined) {
      for (let i = 0; i < nbrs.length; i++) {
        const neighbor = nbrs[i]!;
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }
  }

  if (sorted.length !== nodeIds.length) {
    return {
      ok: false,
      error: {
        code: 'TYPE_MISMATCH',
        message:
          'Graph contains a cycle — cannot perform topological sort',
      },
    };
  }

  return { ok: true, value: sorted };
}

export function buildEnvironment(
  nodeId: string,
  state: LatticeState,
  expressions: ReadonlyMap<string, string>,
): LawResult<Environment> {
  const env = new Map<string, unknown>();
  const activeScene = state.scenes.get(state.activeSceneId)!;

  for (let i = 0; i < activeScene.connections.length; i++) {
    const conn = activeScene.connections[i]!;
    if ((conn.to as string) !== nodeId) continue;

    const sourceId = conn.from as string;
    const sourceOutput = state.values.get(conn.from);

    if (sourceOutput === undefined) {
      const sourceExpr = expressions.get(sourceId);
      if (sourceExpr !== undefined && sourceExpr.length > 0) {
        const parsed = parseAndTypeCheck(sourceExpr);
        if (!parsed.ok) {
          return {
            ok: false,
            error: {
              code: 'TOKEN_INVALID',
              message: `Failed to parse expression for source node '${sourceId}': ${parsed.error.message}`,
            },
          };
        }
        const evalResult = evaluate(parsed.value.expression, env);
        if (!evalResult.ok) {
          return { ok: false, error: evalResult.error };
        }
        env.set(conn.toPort, evalResult.value.value);
        continue;
      }

      return {
        ok: false,
        error: {
          code: 'TOKEN_INVALID',
          message: `Source node '${sourceId}' has no output value`,
        },
      };
    }

    if (
      typeof sourceOutput === 'object' &&
      sourceOutput !== null &&
      !Array.isArray(sourceOutput)
    ) {
      const record = sourceOutput as Record<string, unknown>;
      const portValue = record[conn.fromPort];
      if (portValue !== undefined) {
        env.set(conn.toPort, portValue);
      } else {
        env.set(conn.toPort, sourceOutput);
      }
    } else {
      env.set(conn.toPort, sourceOutput);
    }
  }

  return { ok: true, value: env };
}

export function executeGraph(
  state: LatticeState,
  expressions: ReadonlyMap<string, string>,
): LawResult<GraphExecutionResult> {
  const startTime = Date.now();
  const activeScene = state.scenes.get(state.activeSceneId)!;

  const nodeLikeMap = new Map<
    string,
    {
      readonly kind: string;
      readonly inputs: ReadonlyArray<PortDefinition>;
      readonly outputs: ReadonlyArray<PortDefinition>;
    }
  >();
  for (const [nodeId, node] of activeScene.nodes) {
    nodeLikeMap.set(nodeId as string, latticeNodeToNodeLike(node));
  }

  const connectionLikes = activeScene.connections.map((conn) => ({
    id: conn.id,
    from: conn.from as string,
    to: conn.to as string,
    fromPort: conn.fromPort,
    toPort: conn.toPort,
  }));

  const validation = validateGraph(nodeLikeMap, connectionLikes);
  if (!validation.isValid) {
    const errorMessages = validation.errors
      .map((e) => e.message)
      .join('; ');
    return {
      ok: false,
      error: {
        code: 'TYPE_MISMATCH',
        message: `Graph validation failed: ${errorMessages}`,
      },
    };
  }

  const nodeIds: string[] = [];
  for (const key of activeScene.nodes.keys()) {
    nodeIds.push(key as string);
  }

  const simpleConnections = activeScene.connections.map((conn) => ({
    from: conn.from as string,
    to: conn.to as string,
  }));

  const sortResult = topologicalSort(nodeIds, simpleConnections);
  if (!sortResult.ok) {
    return { ok: false, error: sortResult.error };
  }

  const currentValues = new Map(state.values);
  const trace: ExecutionTrace[] = [];

  for (let i = 0; i < sortResult.value.length; i++) {
    const nodeId = sortResult.value[i]!;
    const node = activeScene.nodes.get(createLatticeNodeId(nodeId));
    if (node === undefined) {
      return {
        ok: false,
        error: {
          code: 'TOKEN_INVALID',
          message: `Node '${nodeId}' not found in state`,
        },
      };
    }

    const currentState: LatticeState = { ...state, values: currentValues };
    const envResult = buildEnvironment(nodeId, currentState, expressions);

    let output: Record<string, unknown>;

    const expr = expressions.get(nodeId);
    if (expr !== undefined && expr.length > 0) {
      if (isJSHybrid(expr)) {
        const env = envResult.ok
          ? Object.fromEntries(envResult.value)
          : {};
        const jsResult = evaluateJS(expr, env);
        if (!jsResult.ok) {
          return { ok: false, error: { code: 'TOKEN_INVALID', message: jsResult.error ?? 'JS evaluation failed' } };
        }
        const outputKeys = Object.keys(node.schema.output);
        const primaryPort = outputKeys[0] ?? 'output';
        output = { [primaryPort]: jsResult.value };
      } else {
        const parsed = parseAndTypeCheck(expr);
        if (!parsed.ok) {
          return { ok: false, error: parsed.error };
        }
        const env = envResult.ok
          ? envResult.value
          : (new Map<string, unknown>() as Environment);
        const evalResult = evaluate(parsed.value.expression, env);
        if (!evalResult.ok) {
          return { ok: false, error: evalResult.error };
        }

        const outputKeys = Object.keys(node.schema.output);
        const primaryPort = outputKeys[0] ?? 'output';
        output = { [primaryPort]: evalResult.value.value };
      }
    } else {
      const input: Record<string, unknown> = {};
      if (envResult.ok) {
        for (const [key, val] of envResult.value) {
          input[key] = val;
        }
      }

      const execResult = executeNode(node, input);
      if (!execResult.ok) {
        return { ok: false, error: execResult.error };
      }
      output = execResult.value;
    }

    currentValues.set(createLatticeNodeId(nodeId), output);

    const outputPortNames = Object.keys(output);
    for (let j = 0; j < outputPortNames.length; j++) {
      const portName = outputPortNames[j]!;
      trace.push({
        nodeId,
        portName,
        valueType: inferPortType(output[portName]),
        timestamp: Date.now(),
      });
    }
  }

  const outputs = new Map<string, unknown>();
  for (const [key, val] of currentValues) {
    outputs.set(key as string, val);
  }

  return {
    ok: true,
    value: {
      success: true,
      outputs,
      trace,
      durationMs: Date.now() - startTime,
    },
  };
}

export function executeSingleNode(
  nodeId: string,
  state: LatticeState,
  expressions: ReadonlyMap<string, string>,
): LawResult<{
  readonly state: LatticeState;
  readonly trace: ReadonlyArray<ExecutionTrace>;
}> {
  const activeScene = state.scenes.get(state.activeSceneId)!;
  const node = activeScene.nodes.get(createLatticeNodeId(nodeId));
  if (node === undefined) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: `Node '${nodeId}' not found in state`,
      },
    };
  }

  const envResult = buildEnvironment(nodeId, state, expressions);

  let output: Record<string, unknown>;

  const expr = expressions.get(nodeId);
  if (expr !== undefined && expr.length > 0) {
    const parsed = parseAndTypeCheck(expr);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }
    const env = envResult.ok
      ? envResult.value
      : (new Map<string, unknown>() as Environment);
    const evalResult = evaluate(parsed.value.expression, env);
    if (!evalResult.ok) {
      return { ok: false, error: evalResult.error };
    }

    const outputKeys = Object.keys(node.schema.output);
    const primaryPort = outputKeys[0] ?? 'output';
    output = { [primaryPort]: evalResult.value.value };
  } else {
    const input: Record<string, unknown> = {};
    if (envResult.ok) {
      for (const [key, val] of envResult.value) {
        input[key] = val;
      }
    }

    const execResult = executeNode(node, input);
    if (!execResult.ok) {
      return { ok: false, error: execResult.error };
    }
    output = execResult.value;
  }

  const newValues = new Map(state.values);
  newValues.set(createLatticeNodeId(nodeId), output);

  const trace: ExecutionTrace[] = [];
  const outputPortNames = Object.keys(output);
  for (let i = 0; i < outputPortNames.length; i++) {
    const portName = outputPortNames[i]!;
    trace.push({
      nodeId,
      portName,
      valueType: inferPortType(output[portName]),
      timestamp: Date.now(),
    });
  }

  return {
    ok: true,
    value: {
      state: {
        ...state,
        values: newValues,
        version: state.version + 1,
      },
      trace,
    },
  };
}
