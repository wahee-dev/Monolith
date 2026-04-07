export type {
  Point,
  Rect,
  BezierCurve,
  FieldView,
  NodeView,
  EdgeView,
  MeshView,
  MeshProjectionFn,
  TypeStatus,
  CanvasState,
  PortInfo,
  ConnectionDragState,
} from './types';

export {
  createPoint,
  createRect,
  rectCenter,
  rectRightCenter,
  rectLeftCenter,
  rectBottomCenter,
  rectTopCenter,
  computeBezierPath,
  pointInRect,
  computeBounds,
  ORIGIN,
} from './geometry';

export { computeLayout, NODE_WIDTH, NODE_BASE_HEIGHT, FIELD_HEIGHT } from './layout';

export { renderStringField } from './renderers/string';
export { renderNumberField } from './renderers/number';
export { renderBooleanField } from './renderers/boolean';
export { renderObjectField } from './renderers/object';
export { renderArrayField } from './renderers/array';

export { projectMesh } from './projector';

export { useMeshProjection } from './hooks/useMeshProjection';
export { useInfiniteCanvas } from './hooks/useInfiniteCanvas';
export { useNodeDrag } from './hooks/useNodeDrag';
export { useConnectionDrag } from './hooks/useConnectionDrag';
export { useExpressionTypeCheck } from './hooks/useExpressionTypeCheck';
export type { TypeCheckResult } from './hooks/useExpressionTypeCheck';
export { useTypeCheckGuard } from './hooks/useTypeCheckGuard';
export type { TypeCheckRunResult } from './hooks/useTypeCheckGuard';

export { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
export type { KeyboardActions } from './hooks/useKeyboardShortcuts';

export { MeshCanvas } from './components/MeshCanvas';
export { NodeView as NodeViewComponent } from './components/NodeView';
export { EdgeView as EdgeViewComponent } from './components/EdgeView';
export { FieldViewComponent } from './components/FieldView';
export { ExpressionEditor } from './components/ExpressionEditor';
