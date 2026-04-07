import type { LawResult } from '@law/types';
import type { LatticeState, LatticeNodeId } from '@lattice/types';
import { executeNode } from '@lattice/nodes';
import { validateGraph } from './validator';
import { getNodeTypeDefinition } from './registry';
import type { ExecutionTrace, PortType } from './types';

export type ExecutionMode = 'stopped' | 'running' | 'stepping' | 'paused';

export type ExecutionStepStatus = 'pending' | 'running' | 'complete' | 'error';

export interface ExecutionStep {
  readonly nodeId: string;
  readonly status: ExecutionStepStatus;
  readonly durationMs: number;
  readonly error: string;
}

export interface ExecutionState {
  readonly mode: ExecutionMode;
  readonly currentStepIndex: number;
  readonly totalSteps: number;
  readonly executionPlan: ReadonlyArray<ExecutionStep>;
  readonly trace: ReadonlyArray<ExecutionTrace>;
  readonly startTime: number;
  readonly durationMs: number;
}

export function createExecutionState(): ExecutionState {
  return {
    mode: 'stopped',
    currentStepIndex: -1,
    totalSteps: 0,
    executionPlan: [],
    trace: [],
    startTime: 0,
    durationMs: 0,
  };
}

function topologicalSort(
  nodeIds: ReadonlyArray<string>,
  connections: ReadonlyArray<{ readonly from: string; readonly to: string }>,
): LawResult<ReadonlyArray<string>> {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (let i = 0; i < nodeIds.length; i++) {
    const id = nodeIds[i]!;
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i]!;
    const existing = adj.get(conn.from);
    if (existing !== undefined) {
      existing.push(conn.to);
    }
    const deg = inDegree.get(conn.to);
    if (deg !== undefined) {
      inDegree.set(conn.to, deg + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    const neighbors = adj.get(current);
    if (neighbors !== undefined) {
      for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i]!;
        const deg = inDegree.get(neighbor);
        if (deg !== undefined) {
          const newDeg = deg - 1;
          inDegree.set(neighbor, newDeg);
          if (newDeg === 0) {
            queue.push(neighbor);
          }
        }
      }
    }
  }

  if (sorted.length !== nodeIds.length) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Graph contains a cycle; cannot create execution plan',
      },
    };
  }

  return { ok: true, value: sorted };
}

function buildNodeInput(
  nodeId: string,
  state: LatticeState,
): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (let i = 0; i < state.connections.length; i++) {
    const conn = state.connections[i]!;
    if (conn.to === nodeId) {
      const sourceValue = state.values.get(conn.from as LatticeNodeId);
      if (sourceValue !== undefined) {
        const record =
          typeof sourceValue === 'object' && sourceValue !== null
            ? sourceValue as Record<string, unknown>
            : { value: sourceValue };
        const fieldValue = record[conn.fromPort];
        if (fieldValue !== undefined) {
          input[conn.toPort] = fieldValue;
        } else {
          input[conn.toPort] = record;
        }
      }
    }
  }
  return input;
}

function inferPortType(value: unknown): PortType {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'any';
}

export function startExecution(state: LatticeState): LawResult<ExecutionState> {
  const nodeIds: string[] = [];
  const nodeLikeMap = new Map<
    string,
    {
      readonly kind: string;
      readonly inputs: ReadonlyArray<{ readonly name: string; readonly type: PortType; readonly label: string; readonly required: boolean }>;
      readonly outputs: ReadonlyArray<{ readonly name: string; readonly type: PortType; readonly label: string; readonly required: boolean }>;
    }
  >();

  for (const [id, node] of state.nodes) {
    const nodeId = id as string;
    nodeIds.push(nodeId);
    const defResult = getNodeTypeDefinition(node.kind);
    if (defResult.ok) {
      nodeLikeMap.set(nodeId, defResult.value);
    } else {
      nodeLikeMap.set(nodeId, {
        kind: node.kind,
        inputs: [],
        outputs: [],
      });
    }
  }

  const connectionLike = state.connections.map((conn) => ({
    id: conn.id,
    from: conn.from as string,
    to: conn.to as string,
    fromPort: conn.fromPort,
    toPort: conn.toPort,
  }));

  const validation = validateGraph(nodeLikeMap, connectionLike);
  if (!validation.isValid) {
    const errorMessages = validation.errors
      .map((e) => e.message)
      .join('; ');
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: `Graph validation failed: ${errorMessages}`,
      },
    };
  }

  const simpleConnections = state.connections.map(
    (conn): { readonly from: string; readonly to: string } => ({
      from: conn.from as string,
      to: conn.to as string,
    }),
  );

  const sortResult = topologicalSort(nodeIds, simpleConnections);
  if (!sortResult.ok) {
    return sortResult;
  }

  const plan: ExecutionStep[] = sortResult.value.map((nodeId) => ({
    nodeId,
    status: 'pending' as ExecutionStepStatus,
    durationMs: 0,
    error: '',
  }));

  return {
    ok: true,
    value: {
      mode: 'running',
      currentStepIndex: -1,
      totalSteps: plan.length,
      executionPlan: plan,
      trace: [],
      startTime: Date.now(),
      durationMs: 0,
    },
  };
}

export function stepExecution(
  execState: ExecutionState,
  latticeState: LatticeState,
): LawResult<{
  readonly execState: ExecutionState;
  readonly latticeState: LatticeState;
}> {
  if (
    execState.mode === 'stopped' ||
    execState.mode === 'paused'
  ) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: `Cannot step: execution is ${execState.mode}`,
      },
    };
  }

  if (isExecutionComplete(execState)) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Cannot step: execution is complete',
      },
    };
  }

  const nextIndex = execState.currentStepIndex + 1;
  const step = execState.executionPlan[nextIndex];
  if (step === undefined) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'No more steps to execute',
      },
    };
  }

  const node = latticeState.nodes.get(step.nodeId as LatticeNodeId);
  if (node === undefined) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: `Node '${step.nodeId}' not found in lattice state`,
      },
    };
  }

  const input = buildNodeInput(step.nodeId, latticeState);
  const stepStart = Date.now();
  const result = executeNode(node, input);
  const stepDuration = Date.now() - stepStart;

  if (!result.ok) {
    const updatedPlan = execState.executionPlan.map((s, i) =>
      i === nextIndex
        ? { ...s, status: 'error' as ExecutionStepStatus, durationMs: stepDuration, error: result.error.message }
        : s,
    );
    const isLast = nextIndex >= execState.executionPlan.length - 1;
    return {
      ok: true,
      value: {
        execState: {
          ...execState,
          mode: isLast ? 'stopped' : 'stepping',
          currentStepIndex: nextIndex,
          executionPlan: updatedPlan,
          durationMs: execState.durationMs + stepDuration,
        },
        latticeState,
      },
    };
  }

  const newValues = new Map(latticeState.values);
  newValues.set(node.id, result.value);

  const newLatticeState: LatticeState = {
    ...latticeState,
    values: newValues,
    version: latticeState.version + 1,
  };

  const traceEntry: ExecutionTrace = {
    nodeId: step.nodeId,
    portName: 'output',
    valueType: inferPortType(result.value),
    timestamp: Date.now(),
  };

  const updatedPlan = execState.executionPlan.map((s, i) =>
    i === nextIndex
      ? { ...s, status: 'complete' as ExecutionStepStatus, durationMs: stepDuration }
      : i > nextIndex
        ? s
        : s,
  );

  const isLast = nextIndex >= execState.executionPlan.length - 1;

  return {
    ok: true,
    value: {
      execState: {
        ...execState,
        mode: isLast ? 'stopped' : 'stepping',
        currentStepIndex: nextIndex,
        executionPlan: updatedPlan,
        trace: [...execState.trace, traceEntry],
        durationMs: execState.durationMs + stepDuration,
      },
      latticeState: newLatticeState,
    },
  };
}

export function pauseExecution(execState: ExecutionState): ExecutionState {
  if (execState.mode !== 'running' && execState.mode !== 'stepping') {
    return execState;
  }
  return {
    ...execState,
    mode: 'paused',
  };
}

export function resetExecution(_execState: ExecutionState): ExecutionState {
  return createExecutionState();
}

export function isExecutionComplete(execState: ExecutionState): boolean {
  if (execState.mode === 'stopped') return false;
  if (execState.currentStepIndex < 0) return false;
  if (execState.executionPlan.length === 0) return false;
  return execState.currentStepIndex >= execState.executionPlan.length - 1;
}
