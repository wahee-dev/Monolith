'use client';

import { useCallback, useRef, useState } from 'react';
import type { CanvasState, Point } from '../types';

interface UseNodeDragResult {
  readonly draggingNodeId: string | null;
  readonly onNodeMouseDown: (nodeId: string, e: React.MouseEvent<SVGGElement>) => void;
  readonly onCanvasMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  readonly onCanvasMouseUp: () => void;
}

interface UseNodeDragOptions {
  readonly canvasState: CanvasState;
  readonly nodePositions: ReadonlyMap<string, Point>;
  readonly onNodeMove: (nodeId: string, newPosition: Point) => void;
}

export function useNodeDrag(options: UseNodeDragOptions): UseNodeDragResult {
  const { canvasState, nodePositions, onNodeMove } = options;
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const nodeStartRef = useRef<Point>({ x: 0, y: 0 });

  const onNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent<SVGGElement>): void => {
      if (e.button !== 0 || e.shiftKey) return;
      e.stopPropagation();
      setDraggingNodeId(nodeId);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      const pos = nodePositions.get(nodeId);
      nodeStartRef.current = pos !== undefined ? { ...pos } : { x: 0, y: 0 };
    },
    [nodePositions],
  );

  const onCanvasMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>): void => {
      if (draggingNodeId === null) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const worldDx = dx / canvasState.zoom;
      const worldDy = dy / canvasState.zoom;
      const newPos: Point = {
        x: nodeStartRef.current.x + worldDx,
        y: nodeStartRef.current.y + worldDy,
      };
      onNodeMove(draggingNodeId, newPos);
    },
    [draggingNodeId, canvasState.zoom, onNodeMove],
  );

  const onCanvasMouseUp = useCallback((): void => {
    setDraggingNodeId(null);
  }, []);

  return {
    draggingNodeId,
    onNodeMouseDown,
    onCanvasMouseMove,
    onCanvasMouseUp,
  };
}
