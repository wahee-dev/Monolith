'use client';

import { useCallback, useMemo } from 'react';
import type { MeshViewV2, CanvasState, Point } from '../types';
import { NodeViewComponent } from './NodeView';
import { EdgeView } from './EdgeView';
import { ExpressionEditor } from './ExpressionEditor';
import { useInfiniteCanvas } from '../hooks/useInfiniteCanvas';

interface MeshCanvasProps {
  readonly view: MeshViewV2;
  readonly canvasState: CanvasState;
  readonly onCanvasStateChange: React.Dispatch<React.SetStateAction<CanvasState>>;
  readonly onNodeSelect: (nodeId: string | null) => void;
  readonly onNodeDoubleClick: (nodeId: string) => void;
  readonly onExpressionChange: (nodeId: string, expression: string) => void;
  readonly onExpressionCommit: (nodeId: string, expression: string) => void;
  readonly containerWidth: number;
  readonly containerHeight: number;
}

const GRID_SIZE = 40;
const GRID_MAJOR_EVERY = 5;

function buildGridLines(
  offset: Point,
  zoom: number,
  width: number,
  height: number,
): React.ReactElement {
  const worldW = width / zoom;
  const worldH = height / zoom;
  const startX = Math.floor(offset.x / GRID_SIZE) * GRID_SIZE;
  const startY = Math.floor(offset.y / GRID_SIZE) * GRID_SIZE;
  const endX = offset.x + worldW + GRID_SIZE;
  const endY = offset.y + worldH + GRID_SIZE;

  const lines: React.ReactElement[] = [];
  let keyIdx = 0;

  for (let x = startX; x <= endX; x += GRID_SIZE) {
    const gridIdx = Math.round(x / GRID_SIZE);
    const isMajor = gridIdx % GRID_MAJOR_EVERY === 0;
    lines.push(
      <line
        key={`v${keyIdx}`}
        x1={x}
        y1={offset.y}
        x2={x}
        y2={offset.y + worldH}
        stroke={isMajor ? '#252540' : '#1a1a2e'}
        strokeWidth={isMajor ? 1 / zoom : 0.5 / zoom}
      />,
    );
    keyIdx++;
  }

  for (let y = startY; y <= endY; y += GRID_SIZE) {
    const gridIdx = Math.round(y / GRID_SIZE);
    const isMajor = gridIdx % GRID_MAJOR_EVERY === 0;
    lines.push(
      <line
        key={`h${keyIdx}`}
        x1={offset.x}
        y1={y}
        x2={offset.x + worldW}
        y2={y}
        stroke={isMajor ? '#252540' : '#1a1a2e'}
        strokeWidth={isMajor ? 1 / zoom : 0.5 / zoom}
      />,
    );
    keyIdx++;
  }

  return <g>{lines}</g>;
}

export function MeshCanvas({
  view,
  canvasState,
  onCanvasStateChange,
  onNodeSelect,
  onNodeDoubleClick,
  onExpressionChange,
  onExpressionCommit,
  containerWidth,
  containerHeight,
}: MeshCanvasProps): React.ReactElement {
  const { svgProps } = useInfiniteCanvas(containerWidth, containerHeight);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target instanceof SVGSVGElement) {
        onNodeSelect(null);
      }
    },
    [onNodeSelect],
  );

  const grid = useMemo(
    () => buildGridLines(canvasState.offset, canvasState.zoom, containerWidth, containerHeight),
    [canvasState.offset, canvasState.zoom, containerWidth, containerHeight],
  );

  const editingNode = useMemo(() => {
    if (canvasState.editingNodeId === null) return null;
    return view.nodes.find((n) => n.id === canvasState.editingNodeId) ?? null;
  }, [canvasState.editingNodeId, view.nodes]);

  return (
    <svg
      width={containerWidth}
      height={containerHeight}
      viewBox={svgProps.viewBox}
      style={{ backgroundColor: '#08080f', cursor: 'grab' }}
      onMouseDown={svgProps.onMouseDown}
      onMouseMove={svgProps.onMouseMove}
      onMouseUp={svgProps.onMouseUp}
      onWheel={svgProps.onWheel}
      onClick={handleCanvasClick}
    >
      {grid}
      {view.edges.map((edge) => (
        <EdgeView key={edge.id} edge={edge} />
      ))}
      {view.nodes.map((node) => (
        <NodeViewComponent
          key={node.id}
          node={node}
          isSelected={canvasState.selectedNodeId === node.id}
          onSelect={onNodeSelect}
          onDoubleClick={onNodeDoubleClick}
          zoom={canvasState.zoom}
        />
      ))}
      {editingNode !== null && (
        <ExpressionEditor
          node={editingNode}
          zoom={canvasState.zoom}
          onExpressionChange={onExpressionChange}
          onExpressionCommit={onExpressionCommit}
          onClose={() => {
            onCanvasStateChange((prev) => ({ ...prev, editingNodeId: null }));
          }}
        />
      )}
    </svg>
  );
}
