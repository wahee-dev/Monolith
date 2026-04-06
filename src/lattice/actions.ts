import type { LatticeState, LatticeStatus, LatticeNode, LatticeConnection, LatticeNodeId } from './types';
import type { LawResult } from '@law/types';
import type { SnapshotState } from './context';

export function updateStatus(state: LatticeState, status: LatticeStatus): LatticeState {
  return {
    ...state,
    status,
    version: state.version + 1,
  };
}

export function addNode(state: LatticeState, node: LatticeNode): LatticeState {
  const newNodes = new Map(state.nodes);
  newNodes.set(node.id, node);
  return {
    ...state,
    nodes: newNodes,
    version: state.version + 1,
  };
}

export function removeNode(state: LatticeState, nodeId: LatticeNodeId): LatticeState {
  const newNodes = new Map(state.nodes);
  newNodes.delete(nodeId);
  const newValues = new Map(state.values);
  newValues.delete(nodeId);
  const newConnections = state.connections.filter(
    (conn) => conn.from !== nodeId && conn.to !== nodeId,
  );
  return {
    ...state,
    nodes: newNodes,
    values: newValues,
    connections: newConnections,
    version: state.version + 1,
  };
}

export function addConnection(state: LatticeState, connection: LatticeConnection): LatticeState {
  return {
    ...state,
    connections: [...state.connections, connection],
    version: state.version + 1,
  };
}

export function removeConnection(state: LatticeState, connectionId: string): LatticeState {
  return {
    ...state,
    connections: state.connections.filter((conn) => conn.id !== connectionId),
    version: state.version + 1,
  };
}

export function setNodeValue(
  state: LatticeState,
  nodeId: LatticeNodeId,
  value: unknown,
): LatticeState {
  const newValues = new Map(state.values);
  newValues.set(nodeId, value);
  return {
    ...state,
    values: newValues,
    version: state.version + 1,
  };
}

export function captureSnapshot(state: LatticeState): SnapshotState {
  return { status: 'captured', state };
}

export function clearSnapshot(): SnapshotState {
  return { status: 'empty' };
}

export function validateState(state: LatticeState): LawResult<LatticeState> {
  for (const connection of state.connections) {
    if (!state.nodes.has(connection.from)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Connection '${connection.id}' references unknown source node '${connection.from as string}'`,
        },
      };
    }
    if (!state.nodes.has(connection.to)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Connection '${connection.id}' references unknown target node '${connection.to as string}'`,
        },
      };
    }
  }
  return { ok: true, value: state };
}
