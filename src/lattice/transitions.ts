import type { GovernanceLedger, PermissionToken, LawResult } from '@law/types';
import type { LatticeState, TransitionResult } from './types';
import type { LatticeEvent } from './events';
import { guard } from '@law/guard';
import { executeNode } from './nodes';
import { addNode, removeNode, addConnection, removeConnection, setNodeValue, validateState } from './actions';

export function applyEvent(
  state: LatticeState,
  event: LatticeEvent,
): LawResult<LatticeState> {
  switch (event.type) {
    case 'LATTICE.ADD_NODE':
      return { ok: true, value: addNode(state, event.node) };
    case 'LATTICE.REMOVE_NODE':
      return { ok: true, value: removeNode(state, event.nodeId) };
    case 'LATTICE.ADD_CONNECTION':
      return { ok: true, value: addConnection(state, event.connection) };
    case 'LATTICE.REMOVE_CONNECTION':
      return { ok: true, value: removeConnection(state, event.connectionId) };
    case 'LATTICE.EXECUTE_NODE': {
      const node = state.nodes.get(event.nodeId);
      if (node === undefined) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Node '${event.nodeId as string}' not found in lattice`,
          },
        };
      }
      const result = executeNode(node, event.input);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      return { ok: true, value: setNodeValue(state, event.nodeId, result.value) };
    }
    case 'LATTICE.INITIALIZE':
    case 'LATTICE.START':
    case 'LATTICE.PAUSE':
    case 'LATTICE.RESUME':
    case 'LATTICE.COMMIT':
    case 'LATTICE.ROLLBACK':
    case 'LATTICE.RESET':
    case 'LATTICE.ERROR':
      return { ok: true, value: state };
  }
}

export async function initiateTransition(
  state: LatticeState,
  event: LatticeEvent,
  token: PermissionToken,
  ledger: GovernanceLedger,
): Promise<TransitionResult> {
  const guardResult = await guard('lattice:transition:initiate', token, ledger);
  if (!guardResult.ok) {
    return { status: 'rolledback', error: guardResult.error, originalState: state };
  }

  const snapshot = state;

  const applied = applyEvent(state, event);
  if (!applied.ok) {
    return { status: 'rolledback', error: applied.error, originalState: snapshot };
  }

  const validated = validateState(applied.value);
  if (!validated.ok) {
    return { status: 'rolledback', error: validated.error, originalState: snapshot };
  }

  return {
    status: 'committed',
    state: validated.value,
    token: guardResult.value,
  };
}
