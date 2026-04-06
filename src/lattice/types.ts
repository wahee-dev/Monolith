import type { PermissionToken, LawError } from '@law/types';

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
  | 'split';

export interface NodeSchema {
  readonly input: Record<string, SchemaField>;
  readonly output: Record<string, SchemaField>;
}

export interface SchemaField {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly required: true;
}

export interface LatticeState {
  readonly nodes: ReadonlyMap<LatticeNodeId, LatticeNode>;
  readonly connections: ReadonlyArray<LatticeConnection>;
  readonly values: ReadonlyMap<LatticeNodeId, unknown>;
  readonly status: LatticeStatus;
  readonly version: number;
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
  | { readonly status: 'rolledback'; readonly error: LawError; readonly originalState: LatticeState };
