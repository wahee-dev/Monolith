import type { GovernanceLedger, PermissionToken } from '@law/types';
import type { LatticeState } from './types';
import type { LatticeEvent } from './events';
import { guard } from '@law/guard';
import { executeNode } from './nodes';
import { addNode, removeNode, addConnection, removeConnection, setNodeValue, validateState } from './actions';

export function applyEvent(
  state: LatticeState,
  event: LatticeEvent,
): { readonly ok: true; readonly state: LatticeState } | { readonly ok: false; readonly reason: string } {
  switch (event.type) {
    case 'LATTICE.ADD_NODE':
      return { ok: true, state: addNode(state, event.node) };
    case 'LATTICE.REMOVE_NODE':
      return { ok: true, state: removeNode(state, event.nodeId) };
    case 'LATTICE.ADD_CONNECTION':
      return { ok: true, state: addConnection(state, event.connection) };
    case 'LATTICE.REMOVE_CONNECTION':
      return { ok: true, state: removeConnection(state, event.connectionId) };
    case 'LATTICE.EXECUTE_NODE': {
      const activeScene = state.scenes.get(state.activeSceneId);
      const node = activeScene?.nodes.get(event.nodeId);
      if (node === undefined) {
        return {
          ok: false,
          reason: `Node '${event.nodeId as string}' not found in lattice`,
        };
      }
      const result = executeNode(node, event.input);
      if (!result.ok) {
        return { ok: false, reason: result.error.message };
      }
      return { ok: true, state: setNodeValue(state, event.nodeId, result.value) };
    }
    case 'LATTICE.INITIALIZE':
    case 'LATTICE.START':
    case 'LATTICE.PAUSE':
    case 'LATTICE.RESUME':
    case 'LATTICE.COMMIT':
    case 'LATTICE.ROLLBACK':
    case 'LATTICE.RESET':
    case 'LATTICE.ERROR':
      return { ok: true, state };
  }
}

export function initiateTransition(
  state: LatticeState,
  event: LatticeEvent,
  token: PermissionToken,
  ledger: GovernanceLedger,
): { readonly status: 'committed'; readonly state: LatticeState; readonly token: PermissionToken } | { readonly status: 'rolledback'; readonly reason: string; readonly originalState: LatticeState } {
  const guardResult = guard('lattice:transition:initiate', token, ledger);
  if (!guardResult.ok) {
    return {
      status: 'rolledback',
      reason: guardResult.error.message,
      originalState: state,
    };
  }

  const snapshot = state;

  const applied = applyEvent(state, event);
  if (!applied.ok) {
    return {
      status: 'rolledback',
      reason: applied.reason,
      originalState: snapshot,
    };
  }

  const validated = validateState(applied.state);
  if (!validated.ok) {
    return {
      status: 'rolledback',
      reason: validated.reason,
      originalState: snapshot,
    };
  }

  return {
    status: 'committed',
    state: validated.value,
    token: guardResult.value,
  };
}
