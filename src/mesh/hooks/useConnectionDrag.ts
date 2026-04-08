'use client';

import { useCallback, useRef, useState } from 'react';
import type { ConnectionDragState, BezierCurve, Point } from '../types';
import type { PortType } from '@engine/types';
import { canConnectTypes } from '@engine/validator';

interface PortInfo {
  readonly nodeId: string;
  readonly portName: string;
  readonly portType: PortType;
  readonly direction: 'input' | 'output';
}

interface UseConnectionDragOptions {
  readonly screenToWorld: (screenX: number, screenY: number) => Point;
  readonly existingConnections: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly fromPort: string;
    readonly toPort: string;
  }>;
  readonly onConnectionCreate: (fromNodeId: string, fromPort: string, toNodeId: string, toPort: string) => void;
  readonly onConnectionValidationError?: (fromType: PortType, toType: PortType) => void;
  readonly getAllPorts: () => ReadonlyArray<PortInfo>;
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
  const { screenToWorld, existingConnections, onConnectionCreate, onConnectionValidationError, getAllPorts } = options;
  const [dragState, setDragState] = useState<ConnectionDragState | null>(null);
  const sourceRef = useRef<{
    readonly nodeId: string;
    readonly portName: string;
    readonly portType: 'input' | 'output';
    readonly portDataType: PortType;
  } | null>(null);

  const computeCompatibleTargets = useCallback(
    (sourceNodeId: string, _sourcePortName: string, sourceDirection: 'input' | 'output', sourceDataType: PortType): ReadonlySet<string> => {
      const compatible = new Set<string>();
      const targetDirection = sourceDirection === 'output' ? 'input' : 'output';
      const allPorts = getAllPorts();

      for (let i = 0; i < allPorts.length; i++) {
        const port = allPorts[i]!;
        if (port.nodeId === sourceNodeId) continue;
        if (port.direction !== targetDirection) continue;

        const fromType = sourceDirection === 'output' ? sourceDataType : port.portType;
        const toType = sourceDirection === 'output' ? port.portType : sourceDataType;

        if (canConnectTypes(fromType, toType)) {
          compatible.add(`${port.nodeId}:${port.portName}:${port.direction}`);
        }
      }
      return compatible;
    },
    [getAllPorts],
  );

  const onPortMouseDown = useCallback(
    (nodeId: string, portName: string, portType: 'input' | 'output', e: React.MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();
      const worldPoint = screenToWorld(e.clientX, e.clientY);

      const allPorts = getAllPorts();
      let portDataType: PortType = 'any';
      for (let i = 0; i < allPorts.length; i++) {
        const p = allPorts[i]!;
        if (p.nodeId === nodeId && p.portName === portName && p.direction === portType) {
          portDataType = p.portType;
          break;
        }
      }

      sourceRef.current = { nodeId, portName, portType, portDataType };

      const compatibleTargetPorts = computeCompatibleTargets(nodeId, portName, portType, portDataType);

      const newDragState: ConnectionDragState = {
        sourceNodeId: nodeId,
        sourcePort: portName,
        sourcePortType: portType,
        sourcePortDataType: portDataType,
        currentPoint: worldPoint,
        compatibleTargetPorts,
      };
      setDragState(newDragState);
    },
    [screenToWorld, getAllPorts, computeCompatibleTargets],
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

      if (source.nodeId === targetNodeId) {
        sourceRef.current = null;
        setDragState(null);
        return;
      }

      let fromNodeId: string;
      let fromPort: string;
      let toNodeId: string;
      let toPort: string;
      let fromDataType: PortType;
      let toDataType: PortType;

      if (source.portType === 'output' && targetPortType === 'input') {
        fromNodeId = source.nodeId;
        fromPort = source.portName;
        toNodeId = targetNodeId;
        toPort = targetPortName;
        fromDataType = source.portDataType;
        const allPorts = getAllPorts();
        toDataType = 'any';
        for (let i = 0; i < allPorts.length; i++) {
          const p = allPorts[i]!;
          if (p.nodeId === targetNodeId && p.portName === targetPortName && p.direction === 'input') {
            toDataType = p.portType;
            break;
          }
        }
      } else if (source.portType === 'input' && targetPortType === 'output') {
        fromNodeId = targetNodeId;
        fromPort = targetPortName;
        toNodeId = source.nodeId;
        toPort = source.portName;
        const allPorts = getAllPorts();
        fromDataType = 'any';
        for (let i = 0; i < allPorts.length; i++) {
          const p = allPorts[i]!;
          if (p.nodeId === targetNodeId && p.portName === targetPortName && p.direction === 'output') {
            fromDataType = p.portType;
            break;
          }
        }
        toDataType = source.portDataType;
      } else {
        sourceRef.current = null;
        setDragState(null);
        return;
      }

      const targetDirection = source.portType === 'output' ? 'input' : 'output';
      const allPorts = getAllPorts();
      const isValidTarget = allPorts.some(
        (p) => p.nodeId === targetNodeId && p.portName === targetPortName && p.direction === targetDirection,
      );
      if (!isValidTarget) {
        sourceRef.current = null;
        setDragState(null);
        return;
      }

      if (!canConnectTypes(fromDataType, toDataType)) {
        onConnectionValidationError?.(fromDataType, toDataType);
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
    [existingConnections, onConnectionCreate, onConnectionValidationError, getAllPorts],
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
