import type { LawResult } from '@law/types';
import type { LatticeState } from '@lattice/types';
import { topologicalSort } from './executor';

export type ExecutionStepStatus =
  | 'pending'
  | 'running'
  | 'complete'
  | 'error';

export interface ExecutionStep {
  readonly nodeId: string;
  readonly status: ExecutionStepStatus;
  readonly durationMs: number;
  readonly error?: string;
}

export function createExecutionPlan(
  state: LatticeState,
): LawResult<ReadonlyArray<ExecutionStep>> {
  const nodeIds: string[] = [];
  for (const key of state.nodes.keys()) {
    nodeIds.push(key as string);
  }

  const simpleConnections = state.connections.map((conn) => ({
    from: conn.from as string,
    to: conn.to as string,
  }));

  const sortResult = topologicalSort(nodeIds, simpleConnections);
  if (!sortResult.ok) {
    return { ok: false, error: sortResult.error };
  }

  const steps: ExecutionStep[] = sortResult.value.map(
    (nodeId): ExecutionStep => ({
      nodeId,
      status: 'pending',
      durationMs: 0,
    }),
  );

  return { ok: true, value: steps };
}

export function getExecutionOrder(
  state: LatticeState,
): LawResult<ReadonlyArray<ReadonlyArray<string>>> {
  const nodeIds: string[] = [];
  for (const key of state.nodes.keys()) {
    nodeIds.push(key as string);
  }

  const incomingCount = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (let i = 0; i < nodeIds.length; i++) {
    const id = nodeIds[i]!;
    incomingCount.set(id, 0);
    dependents.set(id, []);
  }

  for (let i = 0; i < state.connections.length; i++) {
    const conn = state.connections[i]!;
    const to = conn.to as string;
    const from = conn.from as string;
    const count = incomingCount.get(to);
    if (count !== undefined) {
      incomingCount.set(to, count + 1);
    }
    const deps = dependents.get(from);
    if (deps !== undefined) {
      deps.push(to);
    }
  }

  const layers: string[][] = [];
  const processed = new Set<string>();
  const remainingDegree = new Map(incomingCount);

  while (processed.size < nodeIds.length) {
    const layer: string[] = [];

    for (let i = 0; i < nodeIds.length; i++) {
      const id = nodeIds[i]!;
      if (processed.has(id)) continue;
      const deg = remainingDegree.get(id);
      if (deg === 0) {
        layer.push(id);
      }
    }

    if (layer.length === 0) {
      return {
        ok: false,
        error: {
          code: 'TYPE_MISMATCH',
          message:
            'Graph contains a cycle — cannot determine execution order',
        },
      };
    }

    layers.push(layer);

    for (let i = 0; i < layer.length; i++) {
      const id = layer[i]!;
      processed.add(id);
      const deps = dependents.get(id);
      if (deps !== undefined) {
        for (let j = 0; j < deps.length; j++) {
          const depId = deps[j]!;
          const deg = remainingDegree.get(depId);
          if (deg !== undefined) {
            remainingDegree.set(depId, deg - 1);
          }
        }
      }
    }
  }

  return { ok: true, value: layers };
}
