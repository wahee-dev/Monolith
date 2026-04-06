import { setup, assign } from 'xstate';
import type { LatticeMachineContext } from './context';
import type { LatticeEvent } from './events';
import type { LatticeState } from './types';
import type { LawResult } from '@law/types';
import { updateStatus, validateState } from './actions';
import { addNode, removeNode, addConnection, removeConnection, setNodeValue } from './actions';
import { executeNode } from './nodes';
import { createInitialContext, createEmptyLatticeState } from './context';

type EventWithToken = Extract<
  LatticeEvent,
  { readonly token: unknown }
>;

function tryApplyTransition(
  currentState: LatticeState,
  event: LatticeEvent,
): LatticeState {
  let applied: LawResult<LatticeState>;

  switch (event.type) {
    case 'LATTICE.ADD_NODE':
      applied = { ok: true, value: addNode(currentState, event.node) };
      break;
    case 'LATTICE.REMOVE_NODE':
      applied = { ok: true, value: removeNode(currentState, event.nodeId) };
      break;
    case 'LATTICE.ADD_CONNECTION':
      applied = { ok: true, value: addConnection(currentState, event.connection) };
      break;
    case 'LATTICE.REMOVE_CONNECTION':
      applied = { ok: true, value: removeConnection(currentState, event.connectionId) };
      break;
    case 'LATTICE.EXECUTE_NODE': {
      const node = currentState.nodes.get(event.nodeId);
      if (node === undefined) {
        applied = { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Node not found' } };
      } else {
        const result = executeNode(node, event.input);
        if (!result.ok) {
          applied = { ok: false, error: result.error };
        } else {
          applied = { ok: true, value: setNodeValue(currentState, event.nodeId, result.value) };
        }
      }
      break;
    }
    default:
      applied = { ok: false, error: { code: 'VALIDATION_ERROR', message: `Event '${event.type}' is not a mutating transition` } };
      break;
  }

  if (!applied.ok) {
    return { ...currentState, status: 'rolledback', version: currentState.version + 1 };
  }

  const validated = validateState(applied.value);
  if (!validated.ok) {
    return { ...currentState, status: 'rolledback', version: currentState.version + 1 };
  }

  return { ...validated.value, status: 'committed', version: validated.value.version + 1 };
}

export const latticeSetup = setup({
  types: {
    context: {} as LatticeMachineContext,
    events: {} as LatticeEvent,
  },
  guards: {
    hasToken: ({ event }): boolean => {
      return 'token' in event && (event as EventWithToken).token !== undefined;
    },
    isCommitted: ({ context }): boolean => context.state.status === 'committed',
  },
  actions: {
    initializeState: assign({
      state: ({ context }): LatticeState => ({
        ...context.state,
        status: 'idle',
        version: 1,
      }),
    }),
    setStatusRunning: assign({
      state: ({ context }): LatticeState => updateStatus(context.state, 'running'),
    }),
    setStatusPaused: assign({
      state: ({ context }): LatticeState => updateStatus(context.state, 'paused'),
    }),
    applyTransition: assign({
      state: ({ context, event }): LatticeState => {
        return tryApplyTransition(context.state, event);
      },
    }),
    restoreRunning: assign({
      state: ({ context }): LatticeState => ({
        ...context.state,
        status: 'running',
        version: context.state.version + 1,
      }),
    }),
    resetToIdle: assign({
      state: (): LatticeState => createEmptyLatticeState(),
    }),
  },
});

export function createLatticeMachine(
  ledger: Parameters<typeof createInitialContext>[0],
): ReturnType<typeof latticeSetup.createMachine> {
  return latticeSetup.createMachine({
    id: 'lattice',
    initial: 'idle',
    context: createInitialContext(ledger),
    states: {
      idle: {
        on: {
          'LATTICE.INITIALIZE': {
            target: 'ready',
            actions: 'initializeState',
          },
        },
      },
      ready: {
        on: {
          'LATTICE.START': {
            guard: 'hasToken',
            target: 'running',
            actions: 'setStatusRunning',
          },
        },
      },
      running: {
        on: {
          'LATTICE.PAUSE': {
            guard: 'hasToken',
            target: 'paused',
            actions: 'setStatusPaused',
          },
          'LATTICE.ADD_NODE': {
            guard: 'hasToken',
            target: 'transitioning',
          },
          'LATTICE.REMOVE_NODE': {
            guard: 'hasToken',
            target: 'transitioning',
          },
          'LATTICE.ADD_CONNECTION': {
            guard: 'hasToken',
            target: 'transitioning',
          },
          'LATTICE.REMOVE_CONNECTION': {
            guard: 'hasToken',
            target: 'transitioning',
          },
          'LATTICE.EXECUTE_NODE': {
            guard: 'hasToken',
            target: 'transitioning',
          },
          'LATTICE.RESET': {
            target: 'idle',
            actions: 'resetToIdle',
          },
        },
      },
      paused: {
        on: {
          'LATTICE.RESUME': {
            guard: 'hasToken',
            target: 'running',
            actions: 'setStatusRunning',
          },
          'LATTICE.RESET': {
            target: 'idle',
            actions: 'resetToIdle',
          },
        },
      },
      transitioning: {
        entry: 'applyTransition',
        always: [
          {
            guard: 'isCommitted',
            target: 'committed',
          },
          {
            target: 'rolledback',
          },
        ],
      },
      committed: {
        entry: 'restoreRunning',
        always: {
          target: 'running',
        },
      },
      rolledback: {
        entry: 'restoreRunning',
        always: {
          target: 'running',
        },
      },
    },
  });
}
