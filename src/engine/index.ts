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

export {
  topologicalSort,
  buildEnvironment,
  executeGraph,
  executeSingleNode,
} from './executor';

export type { ExecutionStepStatus as SchedulerStepStatus, ExecutionStep as SchedulerExecutionStep } from './scheduler';
export {
  createExecutionPlan,
  getExecutionOrder,
} from './scheduler';

export { preprocessImports, isJSHybrid } from './preprocessor';

export { evaluateJS, executeWithMonolith } from './js-evaluator';

export { getMonolithAPI, createMonolithAPI } from './monolith-api';
export type { ComponentDefinition, NotificationType, ProjectState } from './monolith-api';
