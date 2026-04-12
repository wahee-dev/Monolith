import { setup, assign } from 'xstate';
import type { LatticeMachineContext } from './context';
import type { LatticeEvent } from './events';
import type { LatticeState, SceneState } from './types';
import { updateStatus, validateState } from './actions';
import { addNode, removeNode, addConnection, removeConnection, setNodeValue } from './actions';
import { executeNode } from './nodes';
import { hasInitiatePermission } from './guards';
import { createInitialContext } from './context';

type EventWithToken = Extract<
  LatticeEvent,
  { readonly token: unknown }
>;

function tryApplyTransition(
  currentState: LatticeState,
  event: LatticeEvent,
): LatticeState {
  let applied: { readonly ok: true; readonly state: LatticeState } | { readonly ok: false; readonly reason: string };

  switch (event.type) {
    case 'LATTICE.ADD_NODE':
      applied = { ok: true, state: addNode(currentState, event.node) };
      break;
    case 'LATTICE.REMOVE_NODE':
      applied = { ok: true, state: removeNode(currentState, event.nodeId) };
      break;
    case 'LATTICE.ADD_CONNECTION':
      applied = { ok: true, state: addConnection(currentState, event.connection) };
      break;
    case 'LATTICE.REMOVE_CONNECTION':
      applied = { ok: true, state: removeConnection(currentState, event.connectionId) };
      break;
    case 'LATTICE.EXECUTE_NODE': {
      const activeScene = currentState.scenes.get(currentState.activeSceneId);
      const node = activeScene?.nodes.get(event.nodeId);
      if (node === undefined) {
        applied = { ok: false, reason: `Node not found` };
      } else {
        const result = executeNode(node, event.input);
        if (!result.ok) {
          applied = { ok: false, reason: result.error.message };
        } else {
          applied = { ok: true, state: setNodeValue(currentState, event.nodeId, result.value) };
        }
      }
      break;
    }
    default:
      applied = { ok: false, reason: `Event '${event.type}' is not a mutating transition` };
      break;
  }

  if (!applied.ok) {
    return { ...currentState, status: 'rolledback', version: currentState.version + 1 };
  }

  const validated = validateState(applied.state);
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
    hasPermission: ({ context, event }): boolean => {
      if (!('token' in event)) return false;
      const typedEvent = event as EventWithToken;
      return hasInitiatePermission(typedEvent.token, context.ledger);
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
      state: (): LatticeState => {
        const mainScene: SceneState = { id: 'main', name: 'Main', nodes: new Map(), connections: [] };
        return {
          scenes: new Map([['main', mainScene]]),
          activeSceneId: 'main',
          values: new Map(),
          status: 'idle',
          version: 0,
        };
      },
    }),
  },
});

export function createLatticeMachine(ledger: Parameters<typeof createInitialContext>[0]) {
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
            guard: 'hasPermission',
            target: 'running',
            actions: 'setStatusRunning',
          },
        },
      },
      running: {
        on: {
          'LATTICE.PAUSE': {
            guard: 'hasPermission',
            target: 'paused',
            actions: 'setStatusPaused',
          },
          'LATTICE.ADD_NODE': {
            guard: 'hasPermission',
            target: 'transitioning',
          },
          'LATTICE.REMOVE_NODE': {
            guard: 'hasPermission',
            target: 'transitioning',
          },
          'LATTICE.ADD_CONNECTION': {
            guard: 'hasPermission',
            target: 'transitioning',
          },
          'LATTICE.REMOVE_CONNECTION': {
            guard: 'hasPermission',
            target: 'transitioning',
          },
          'LATTICE.EXECUTE_NODE': {
            guard: 'hasPermission',
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
            guard: 'hasPermission',
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
