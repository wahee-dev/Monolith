import type { PermissionToken, LawError } from '@law/types';
import type { LatticeNodeId, LatticeNode, LatticeConnection } from './types';

export type LatticeEvent =
  | { readonly type: 'LATTICE.INITIALIZE' }
  | { readonly type: 'LATTICE.START'; readonly token: PermissionToken }
  | { readonly type: 'LATTICE.PAUSE'; readonly token: PermissionToken }
  | { readonly type: 'LATTICE.RESUME'; readonly token: PermissionToken }
  | {
      readonly type: 'LATTICE.EXECUTE_NODE';
      readonly nodeId: LatticeNodeId;
      readonly input: Record<string, unknown>;
      readonly token: PermissionToken;
    }
  | { readonly type: 'LATTICE.COMMIT'; readonly token: PermissionToken }
  | { readonly type: 'LATTICE.ROLLBACK'; readonly reason: string }
  | { readonly type: 'LATTICE.ADD_NODE'; readonly node: LatticeNode; readonly token: PermissionToken }
  | { readonly type: 'LATTICE.REMOVE_NODE'; readonly nodeId: LatticeNodeId; readonly token: PermissionToken }
  | {
      readonly type: 'LATTICE.ADD_CONNECTION';
      readonly connection: LatticeConnection;
      readonly token: PermissionToken;
    }
  | {
      readonly type: 'LATTICE.REMOVE_CONNECTION';
      readonly connectionId: string;
      readonly token: PermissionToken;
    }
  | { readonly type: 'LATTICE.RESET' }
  | { readonly type: 'LATTICE.ERROR'; readonly error: LawError };
