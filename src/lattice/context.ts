import type { GovernanceLedger } from '@law/types';
import type { LatticeState, SceneState } from './types';

export type SnapshotState =
  | { readonly status: 'empty' }
  | { readonly status: 'captured'; readonly state: LatticeState };

export interface LatticeMachineContext {
  readonly state: LatticeState;
  readonly ledger: GovernanceLedger;
  readonly snapshot: SnapshotState;
}

export function createEmptyLatticeState(): LatticeState {
  const mainScene: SceneState = { id: 'main', name: 'Main', nodes: new Map(), connections: [] };
  return {
    scenes: new Map([['main', mainScene]]),
    activeSceneId: 'main',
    values: new Map(),
    status: 'idle',
    version: 0,
  };
}

export function createInitialContext(ledger: GovernanceLedger): LatticeMachineContext {
  return {
    state: createEmptyLatticeState(),
    ledger,
    snapshot: { status: 'empty' },
  };
}
