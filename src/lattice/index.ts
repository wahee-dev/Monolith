export type {
  LatticeNodeId,
  LatticeNode,
  LatticeNodeKind,
  NodeSchema,
  SchemaField,
  LatticeState,
  LatticeStatus,
  LatticeConnection,
  TransitionResult,
} from './types';

export { createLatticeNodeId } from './types';

export type { LatticeEvent } from './events';

export type { LatticeMachineContext, SnapshotState } from './context';
export { createEmptyLatticeState, createInitialContext } from './context';

export {
  executeSourceNode,
  executeTransformNode,
  executeSinkNode,
  executeGateNode,
  executeMergeNode,
  executeSplitNode,
  executeNode,
} from './nodes';

export {
  updateStatus,
  addNode,
  removeNode,
  addConnection,
  removeConnection,
  setNodeValue,
  captureSnapshot,
  clearSnapshot,
  resetState,
  validateState,
} from './actions';

export { checkPermission, hasInitiatePermission, hasCommitPermission, hasRollbackPermission } from './guards';

export { applyEvent, initiateTransition } from './transitions';

export { latticeSetup, createLatticeMachine } from './machine';

export { serializeState, deserializeState, computeStateHash } from './persistence';
