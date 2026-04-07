'use client';

import { useCallback, useRef, useState } from 'react';
import type { ConnectionDragState, BezierCurve, Point } from '../types';

interface UseConnectionDragOptions {
  readonly screenToWorld: (screenX: number, screenY: number) => Point;
  readonly existingConnections: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly fromPort: string;
    readonly toPort: string;
  }>;
  readonly onConnectionCreate: (fromNodeId: string, fromPort: string, toNodeId: string, toPort: string) => void;
}

interface TempEdge {
  readonly curve: BezierCurve;
}

interface UseConnectionDragResult {
  readonly dragState: ConnectionDragState | null;
  readonly tempEdge: TempEdge | null;
  readonly onPortMouseDown: (nodeId: string, portName: string, portType: 'input' | 'output', e: React.MouseEvent) => void;
  readonly onPortMouseUp: (nodeId: string, portName: string, portType: 'input' | 'output') => void;
  readonly onCanvasMouseMove: (e: React.MouseEvent) => void;
  readonly onCanvasMouseUp: () => void;
}

function computeTempBezier(start: Point, end: Point): BezierCurve {
  const dx = Math.abs(end.x - start.x);
  const offset = Math.max(dx * 0.5, 50);
  return {
    start,
    control1: { x: start.x + offset, y: start.y },
    control2: { x: end.x - offset, y: end.y },
    end,
  };
}

export function useConnectionDrag(options: UseConnectionDragOptions): UseConnectionDragResult {
  const { screenToWorld, existingConnections, onConnectionCreate } = options;
  const [dragState, setDragState] = useState<ConnectionDragState | null>(null);
  const sourceRef = useRef<ConnectionDragState | null>(null);

  const onPortMouseDown = useCallback(
    (nodeId: string, portName: string, portType: 'input' | 'output', e: React.MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();
      const worldPoint = screenToWorld(e.clientX, e.clientY);
      const newDragState: ConnectionDragState = {
        sourceNodeId: nodeId,
        sourcePort: portName,
        sourcePortType: portType,
        currentPoint: worldPoint,
      };
      sourceRef.current = newDragState;
      setDragState(newDragState);
    },
    [screenToWorld],
  );

  const onCanvasMouseMove = useCallback(
    (e: React.MouseEvent): void => {
      if (sourceRef.current === null) return;
      const worldPoint = screenToWorld(e.clientX, e.clientY);
      setDragState((prev) => {
        if (prev === null) return null;
        return { ...prev, currentPoint: worldPoint };
      });
    },
    [screenToWorld],
  );

  const onPortMouseUp = useCallback(
    (targetNodeId: string, targetPortName: string, targetPortType: 'input' | 'output'): void => {
      const source = sourceRef.current;
      if (source === null) return;

      if (source.sourceNodeId === targetNodeId) {
        sourceRef.current = null;
        setDragState(null);
        return;
      }

      let fromNodeId: string;
      let fromPort: string;
      let toNodeId: string;
      let toPort: string;

      if (source.sourcePortType === 'output' && targetPortType === 'input') {
        fromNodeId = source.sourceNodeId;
        fromPort = source.sourcePort;
        toNodeId = targetNodeId;
        toPort = targetPortName;
      } else if (source.sourcePortType === 'input' && targetPortType === 'output') {
        fromNodeId = targetNodeId;
        fromPort = targetPortName;
        toNodeId = source.sourceNodeId;
        toPort = source.sourcePort;
      } else {
        sourceRef.current = null;
        setDragState(null);
        return;
      }

      const isDuplicate = existingConnections.some(
        (c) =>
          c.from === fromNodeId &&
          c.to === toNodeId &&
          c.fromPort === fromPort &&
          c.toPort === toPort,
      );

      if (!isDuplicate) {
        onConnectionCreate(fromNodeId, fromPort, toNodeId, toPort);
      }

      sourceRef.current = null;
      setDragState(null);
    },
    [existingConnections, onConnectionCreate],
  );

  const onCanvasMouseUp = useCallback((): void => {
    sourceRef.current = null;
    setDragState(null);
  }, []);

  const tempEdge: TempEdge | null = dragState !== null
    ? { curve: computeTempBezier(dragState.currentPoint, dragState.currentPoint) }
    : null;

  return {
    dragState,
    tempEdge,
    onPortMouseDown,
    onPortMouseUp,
    onCanvasMouseMove,
    onCanvasMouseUp,
  };
}
