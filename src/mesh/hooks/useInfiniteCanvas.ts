'use client';

import { useCallback, useRef } from 'react';
import type { Point, CanvasState } from '../types';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;
const ZOOM_FACTOR = 0.001;

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
}

const INITIAL_DRAG: DragState = {
  isDragging: false,
  startX: 0,
  startY: 0,
  startOffsetX: 0,
  startOffsetY: 0,
};

export function useInfiniteCanvas(
  canvasState: CanvasState,
  setCanvasState: React.Dispatch<React.SetStateAction<CanvasState>>,
  containerWidth: number,
  containerHeight: number,
): {
  readonly svgProps: {
    readonly viewBox: string;
    readonly onMouseDown: (e: React.MouseEvent) => void;
    readonly onMouseMove: (e: React.MouseEvent) => void;
    readonly onMouseUp: () => void;
    readonly onWheel: (e: React.WheelEvent) => void;
  };
  readonly screenToWorld: (screen: Point) => Point;
  readonly panTo: (point: Point) => void;
  readonly zoomTo: (level: number, center?: Point) => void;
} {
  const dragRef = useRef<DragState>(INITIAL_DRAG);

  const viewBox = `${canvasState.offset.x} ${canvasState.offset.y} ${containerWidth / canvasState.zoom} ${containerHeight / canvasState.zoom}`;

  const screenToWorld = useCallback(
    (screen: Point): Point => ({
      x: screen.x / canvasState.zoom + canvasState.offset.x,
      y: screen.y / canvasState.zoom + canvasState.offset.y,
    }),
    [canvasState.zoom, canvasState.offset],
  );

  const panTo = useCallback((point: Point): void => {
    setCanvasState((prev) => ({ ...prev, offset: point }));
  }, [setCanvasState]);

  const zoomTo = useCallback((level: number, center?: Point): void => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
    setCanvasState((prev) => {
      if (center !== undefined) {
        const worldBefore = {
          x: center.x / prev.zoom + prev.offset.x,
          y: center.y / prev.zoom + prev.offset.y,
        };
        const newOffset = {
          x: worldBefore.x - center.x / clamped,
          y: worldBefore.y - center.y / clamped,
        };
        return { ...prev, zoom: clamped, offset: newOffset };
      }
      return { ...prev, zoom: clamped };
    });
  }, [setCanvasState]);

  const onMouseDown = useCallback((e: React.MouseEvent): void => {
    const isMiddleButton = e.button === 1;
    const isShiftLeft = e.button === 0 && e.shiftKey;
    if (isMiddleButton || isShiftLeft) {
      e.preventDefault();
      dragRef.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: canvasState.offset.x,
        startOffsetY: canvasState.offset.y,
      };
    }
  }, [canvasState.offset]);

  const onMouseMove = useCallback((e: React.MouseEvent): void => {
    if (!dragRef.current.isDragging) return;
    const dx = (e.clientX - dragRef.current.startX) / canvasState.zoom;
    const dy = (e.clientY - dragRef.current.startY) / canvasState.zoom;
    setCanvasState((prev) => ({
      ...prev,
      offset: {
        x: dragRef.current.startOffsetX - dx,
        y: dragRef.current.startOffsetY - dy,
      },
    }));
  }, [canvasState.zoom, setCanvasState]);

  const onMouseUp = useCallback((): void => {
    dragRef.current = INITIAL_DRAG;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent): void => {
    e.preventDefault();
    const delta = -e.deltaY * ZOOM_FACTOR;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, canvasState.zoom * (1 + delta)));
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldBefore = {
      x: mouseX / canvasState.zoom + canvasState.offset.x,
      y: mouseY / canvasState.zoom + canvasState.offset.y,
    };
    const newOffset = {
      x: worldBefore.x - mouseX / newZoom,
      y: worldBefore.y - mouseY / newZoom,
    };

    setCanvasState((prev) => ({
      ...prev,
      zoom: newZoom,
      offset: newOffset,
    }));
  }, [canvasState.zoom, canvasState.offset, setCanvasState]);

  return {
    svgProps: {
      viewBox,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onWheel,
    },
    screenToWorld,
    panTo,
    zoomTo,
  };
}
