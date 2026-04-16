import type { PermissionToken } from '@law/types';

export type LatticeNodeId = string & { readonly __brand: unique symbol };

export function createLatticeNodeId(id: string): LatticeNodeId {
  return id as LatticeNodeId;
}

export interface LatticeNode {
  readonly id: LatticeNodeId;
  readonly kind: LatticeNodeKind;
  readonly schema: NodeSchema;
}

export type LatticeNodeKind =
  | 'source'
  | 'transform'
  | 'sink'
  | 'gate'
  | 'merge'
  | 'split'
  | 'text'
  | 'button'
  | 'input'
  | 'container'
  | 'image'
  | 'flex'
  | 'math'
  | 'string-transform'
  | 'getState'
  | 'setState'
  | 'onEvent'
  | 'constant'
  | 'if-else'
  | 'if-condition'
  | 'switch'
  | 'compare'
  | 'and'
  | 'or'
  | 'not'
  | 'foreach'
  | 'function'
  | 'array'
  | 'variable-state'
  | 'http-request'
  | 'timer'
  | 'console-log'
  | 'webhook'
  | 'store'
  | 'fetch'
  | 'delay'
  | 'batch'
  | 'debounce'
  | 'merge-objects'
  | 'split-object'
  | 'retry'
  | 'json-parse'
  | 'json-stringify'
  | 'template'
  | 'variable'
  | 'navigate'
  | 'subscribe';

export interface NodeSchema {
  readonly input: Record<string, SchemaField>;
  readonly output: Record<string, SchemaField>;
}

export interface SchemaField {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly required: boolean;
}

export interface LatticeState {
  readonly scenes: ReadonlyMap<string, SceneState>;
  readonly activeSceneId: string;
  readonly values: ReadonlyMap<LatticeNodeId, unknown>;
  readonly status: LatticeStatus;
  readonly version: number;
}

export interface SceneState {
  readonly id: string;
  readonly name: string;
  readonly nodes: ReadonlyMap<LatticeNodeId, LatticeNode>;
  readonly connections: ReadonlyArray<LatticeConnection>;
}

export type LatticeStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'error'
  | 'committed'
  | 'rolledback';

export interface LatticeConnection {
  readonly id: string;
  readonly from: LatticeNodeId;
  readonly to: LatticeNodeId;
  readonly fromPort: string;
  readonly toPort: string;
}

export type TransitionResult =
  | { readonly status: 'committed'; readonly state: LatticeState; readonly token: PermissionToken }
  | { readonly status: 'rolledback'; readonly reason: string; readonly originalState: LatticeState };
