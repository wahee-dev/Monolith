export type {
  PortType,
  PortDefinition,
  NodeCategory,
  NodeTypeDefinition,
  ConnectionValidation,
  GraphValidation,
  GraphValidationError,
  GraphValidationWarning,
  ExecutionTrace,
  GraphExecutionResult,
} from './types';

export {
  canConnectTypes,
  validateConnection,
  detectCycles,
  findOrphanNodes,
  findMissingInputs,
  validateGraph,
} from './validator';

export {
  NODE_REGISTRY,
  getNodeTypeDefinition,
  getAllCategories,
  getNodesByCategory,
  searchNodes,
} from './registry';

export type {
  Point as HistoryPoint,
  HistoryEntry,
  HistoryState,
} from './history';

export {
  createHistory,
  pushHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  getHistoryLabel,
} from './history';

export type {
  ExecutionMode,
  ExecutionStepStatus,
  ExecutionStep,
  ExecutionState,
} from './execution';

export {
  createExecutionState,
  startExecution,
  stepExecution,
  pauseExecution,
  resetExecution,
  isExecutionComplete,
} from './execution';
