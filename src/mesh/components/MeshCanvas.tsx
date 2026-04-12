'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MeshView, Point } from '../types';
import type { PortType } from '@engine/types';
import { useInfiniteCanvas } from '../hooks/useInfiniteCanvas';
import { useNodeDrag } from '../hooks/useNodeDrag';
import { useConnectionDrag } from '../hooks/useConnectionDrag';
import { NodeView as NodeViewComponent } from './NodeView';
import { ExpressionEditor } from './ExpressionEditor';
import { computeBezierPath } from '../geometry';
import { Minimap } from '@minimap/Minimap';

interface PortInfoForDrag {
  readonly nodeId: string;
  readonly portName: string;
  readonly portType: PortType;
  readonly direction: 'input' | 'output';
}

interface MeshCanvasProps {
  readonly view: MeshView;
  readonly selectedNodeId: string | null;
  readonly selectedEdgeId: string | null;
  readonly editingNodeId: string | null;
  readonly nodePositions: ReadonlyMap<string, Point>;
  readonly isBlocking: boolean;
  readonly errorNodeIds: ReadonlySet<string>;
  readonly errorEdgeIds: ReadonlySet<string>;
  readonly executingNodeIds: ReadonlySet<string>;
  readonly completedNodeIds: ReadonlySet<string>;
  readonly errorExecutionNodeIds: ReadonlySet<string>;
  readonly onNodeMove: (nodeId: string, newPosition: Point) => void;
  readonly onNodeSelect: (nodeId: string | null) => void;
  readonly onNodeDoubleClick: (nodeId: string) => void;
  readonly onExpressionCommit: (nodeId: string, expression: string) => void;
  readonly onExpressionCancel: () => void;
  readonly onConnectionCreate: (fromNodeId: string, fromPort: string, toNodeId: string, toPort: string) => void;
  readonly onConnectionValidationError: ((fromType: PortType, toType: PortType) => void) | undefined;
  readonly onEdgeSelect: (edgeId: string | null) => void;
  readonly existingConnections: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly fromPort: string;
    readonly toPort: string;
  }>;
}

function buildGridDefs(): React.ReactElement {
  return (
    <defs>
      <pattern
        id="grid-thin"
        width="40"
        height="40"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 40 0 L 0 0 0 40"
          fill="none"
          stroke="#1d1f27"
          strokeWidth="0.5"
        />
      </pattern>
      <pattern
        id="grid-thick"
        width="200"
        height="200"
        patternUnits="userSpaceOnUse"
      >
        <rect width="200" height="200" fill="url(#grid-thin)" />
        <path
          d="M 200 0 L 0 0 0 200"
          fill="none"
          stroke="#2b2e3b"
          strokeWidth="1"
        />
      </pattern>
      <filter id="glow-cyan">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feFlood floodColor="#00ffff" floodOpacity="0.6" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glow-green">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feFlood floodColor="#22c55e" floodOpacity="0.5" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glow-red">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feFlood floodColor="#ef4444" floodOpacity="0.5" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

function ExecutionOverlay({
  node,
  isExecuting,
  isCompleted,
  isError,
}: {
  readonly node: { readonly id: string; readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } };
  readonly isExecuting: boolean;
  readonly isCompleted: boolean;
  readonly isError: boolean;
}): React.ReactElement | null {
  if (!isExecuting && !isCompleted && !isError) return null;

  const { x, y, width, height } = node.rect;

  if (isExecuting) {
    return (
      <g>
        <rect
          x={x - 2}
          y={y - 2}
          width={width + 4}
          height={height + 4}
          fill="none"
          stroke="#00ffff"
          strokeWidth="2"
          filter="url(#glow-cyan)"
          rx="4"
        >
          <animate
            attributeName="stroke-opacity"
            values="1;0.4;1"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </rect>
      </g>
    );
  }

  if (isCompleted) {
    return (
      <g>
        <rect
          x={x - 1}
          y={y - 1}
          width={width + 2}
          height={height + 2}
          fill="none"
          stroke="#22c55e"
          strokeWidth="1.5"
          rx="4"
          opacity="0.6"
        />
        <text
          x={x + width - 4}
          y={y + 4}
          fill="#22c55e"
          fontSize="10"
          fontFamily="monospace"
        >
          &#10003;
        </text>
      </g>
    );
  }

  if (isError) {
    return (
      <g>
        <rect
          x={x - 1}
          y={y - 1}
          width={width + 2}
          height={height + 2}
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.5"
          filter="url(#glow-red)"
          rx="4"
        />
        <text
          x={x + width - 4}
          y={y + 4}
          fill="#ef4444"
          fontSize="10"
          fontFamily="monospace"
        >
          &#10005;
        </text>
      </g>
    );
  }

  return null;
}

function ValidationErrorOverlay({
  node,
  hasError,
}: {
  readonly node: { readonly id: string; readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } };
  readonly hasError: boolean;
}): React.ReactElement | null {
  if (!hasError) return null;

  const { x, y, width, height } = node.rect;

  return (
    <rect
      x={x - 2}
      y={y - 2}
      width={width + 4}
      height={height + 4}
      fill="none"
      stroke="#ef4444"
      strokeWidth="2"
      strokeDasharray="4 2"
      rx="4"
      opacity="0.8"
    />
  );
}

function AnimatedEdge({
  edge,
  isSelected,
  hasError,
}: {
  readonly edge: { readonly id: string; readonly curve: { readonly start: Point; readonly control1: Point; readonly control2: Point; readonly end: Point } };
  readonly isSelected: boolean;
  readonly hasError: boolean;
}): React.ReactElement {
  const { start, control1, control2, end } = edge.curve;
  const d = `M ${start.x} ${start.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`;

  const strokeColor = hasError ? '#ef4444'
    : isSelected ? '#00ffff'
    : edge.id.startsWith('conn-') ? '#4a6fa5' : '#4a6fa5';

  const dashArray = hasError ? '6 4' : undefined;

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isSelected ? 3 : 2}
        strokeDasharray={dashArray}
        opacity={0.7}
      />
    </g>
  );
}

export function MeshCanvas({
  view,
  selectedNodeId,
  selectedEdgeId,
  editingNodeId,
  nodePositions,
  isBlocking,
  errorNodeIds,
  errorEdgeIds,
  executingNodeIds,
  completedNodeIds,
  errorExecutionNodeIds,
  onNodeMove,
  onNodeSelect,
  onNodeDoubleClick,
  onExpressionCommit,
  onExpressionCancel,
  onConnectionCreate,
  onConnectionValidationError,
  onEdgeSelect,
  existingConnections,
}: MeshCanvasProps): React.ReactElement {
  const [svgDims, setSvgDims] = useState({ width: 800, height: 600 });
  useEffect(() => {
    setSvgDims({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = (): void =>
      setSvgDims({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const canvas = useInfiniteCanvas(svgDims.width, svgDims.height);
  const drag = useNodeDrag({
    canvasState: canvas.canvasState,
    nodePositions,
    onNodeMove,
  });

  const getAllPorts = useCallback((): ReadonlyArray<PortInfoForDrag> => {
    const ports: PortInfoForDrag[] = [];
    for (let i = 0; i < view.nodes.length; i++) {
      const node = view.nodes[i]!;
      for (let j = 0; j < node.ports.length; j++) {
        const port = node.ports[j]!;
        ports.push({
          nodeId: node.id,
          portName: port.name,
          portType: port.type,
          direction: port.direction,
        });
      }
    }
    return ports;
  }, [view.nodes]);

  const connDrag = useConnectionDrag({
    screenToWorld: canvas.screenToWorld,
    existingConnections,
    onConnectionCreate,
    onConnectionValidationError: onConnectionValidationError ?? ((_f: PortType, _t: PortType) => { return; }),
    getAllPorts,
  });

  const positionedNodes = useMemo(() => {
    return view.nodes.map((node) => {
      const pos = nodePositions.get(node.id);
      if (pos !== undefined) {
        const dx = pos.x - node.rect.x;
        const dy = pos.y - node.rect.y;
        return {
          ...node,
          rect: { ...node.rect, x: pos.x, y: pos.y },
          ports: node.ports.map((p) => ({
            ...p,
            position: { x: p.position.x + dx, y: p.position.y + dy },
          })),
          fields: node.fields
            ? node.fields.map((f) => ({
                ...f,
                position: { x: f.position.x + dx, y: f.position.y + dy },
              }))
            : node.fields,
        };
      }
      return node;
    });
  }, [view.nodes, nodePositions]);

  const nodeMap = useMemo(() => {
    return new Map(positionedNodes.map((n) => [n.id, n]));
  }, [positionedNodes]);

  const recomputedEdges = useMemo(() => {
    return view.edges.map((edge) => {
      const fromNode = nodeMap.get(edge.fromNodeId);
      const toNode = nodeMap.get(edge.toNodeId);
      if (fromNode === undefined || toNode === undefined) return edge;
      const curve = computeBezierPath(fromNode.rect, toNode.rect);
      return { ...edge, curve };
    });
  }, [view.edges, nodeMap]);

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>): void => {
      if (e.target instanceof SVGSVGElement) {
        onNodeSelect(null);
      }
    },
    [onNodeSelect],
  );

  const handleSvgMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>): void => {
      canvas.svgProps.onMouseDown(e);
    },
    [canvas.svgProps],
  );

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>): void => {
      canvas.svgProps.onMouseMove(e);
      drag.onCanvasMouseMove(e);
      connDrag.onCanvasMouseMove(e);
    },
    [canvas.svgProps, drag, connDrag],
  );

  const handleSvgMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>): void => {
      canvas.svgProps.onMouseUp(e);
      drag.onCanvasMouseUp();
      connDrag.onCanvasMouseUp();
    },
    [canvas.svgProps, drag, connDrag],
  );

  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent<SVGGElement>): void => {
      onNodeSelect(nodeId);
      drag.onNodeMouseDown(nodeId, e);
    },
    [onNodeSelect, drag],
  );

  const handleEdgeClick = useCallback(
    (edgeId: string, e: React.MouseEvent): void => {
      e.stopPropagation();
      onEdgeSelect(edgeId);
    },
    [onEdgeSelect],
  );

  const activeDrag = connDrag.dragState;

  const dragStartPoint = useMemo((): Point | null => {
    if (activeDrag === null) return null;
    const sourceNode = nodeMap.get(activeDrag.sourceNodeId);
    if (sourceNode === undefined) return null;
    const port = sourceNode.ports.find(
      (p) => p.direction === activeDrag.sourcePortType && p.name === activeDrag.sourcePort,
    );
    if (port === undefined) return null;
    return {
      x: port.position.x,
      y: port.position.y,
    };
  }, [activeDrag, nodeMap]);

  const tempEdgePath = useMemo((): string | null => {
    if (dragStartPoint === null || activeDrag === null) return null;
    const dx = Math.abs(activeDrag.currentPoint.x - dragStartPoint.x);
    const offset = Math.max(dx * 0.5, 50);
    const isOutput = activeDrag.sourcePortType === 'output';
    const start = dragStartPoint;
    const end = activeDrag.currentPoint;
    const sx = start.x;
    const sy = start.y;
    const ex = end.x;
    const ey = end.y;
    const ctrlOffset = isOutput ? offset : -offset;
    return `M ${sx} ${sy} C ${sx + ctrlOffset} ${sy}, ${ex - ctrlOffset} ${ey}, ${ex} ${ey}`;
  }, [dragStartPoint, activeDrag]);

  const draggingPortType: PortType | null = activeDrag?.sourcePortDataType ?? null;
  const draggingPortDirection: 'input' | 'output' | null = activeDrag?.sourcePortType ?? null;
  const compatiblePortKeys: ReadonlySet<string> | null = activeDrag?.compatibleTargetPorts ?? null;

  const vb = canvas.svgProps.viewBox.split(' ');
  const vbX = Number(vb[0] ?? 0);
  const vbY = Number(vb[1] ?? 0);
  const vbW = Number(vb[2] ?? 800);
  const vbH = Number(vb[3] ?? 600);

  const editingNode = editingNodeId !== null
    ? nodeMap.get(editingNodeId)
    : undefined;

  const minimapNodes = useMemo(
    () =>
      positionedNodes.map((n) => ({
        id: n.id,
        x: n.rect.x,
        y: n.rect.y,
        kind: n.kind,
        color: n.color,
      })),
    [positionedNodes],
  );

  const minimapEdges = useMemo(
    () =>
      recomputedEdges.map((e) => ({
        fromX: e.curve.start.x,
        fromY: e.curve.start.y,
        toX: e.curve.end.x,
        toY: e.curve.end.y,
      })),
    [recomputedEdges],
  );

  const minimapViewport = useMemo(
    () => ({
      x: canvas.canvasState.offset.x - vbW / 2,
      y: canvas.canvasState.offset.y - vbH / 2,
      width: vbW,
      height: vbH,
    }),
    [canvas.canvasState.offset, vbW, vbH],
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        viewBox={canvas.svgProps.viewBox}
        style={canvas.svgProps.style}
        ref={canvas.svgProps.ref}
        onWheel={canvas.svgProps.onWheel}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onClick={handleSvgClick}
      >
        {buildGridDefs()}
        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="#20232e" />
        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#grid-thick)" />

        {recomputedEdges.map((edge) => (
          <g key={edge.id} onClick={(e) => handleEdgeClick(edge.id, e)}>
            <AnimatedEdge
              edge={edge}
              isSelected={edge.id === selectedEdgeId}
              hasError={errorEdgeIds.has(edge.id)}
            />
          </g>
        ))}

        {positionedNodes.map((node) => (
          <g key={node.id}>
            <ValidationErrorOverlay
              node={node}
              hasError={errorNodeIds.has(node.id)}
            />
            <ExecutionOverlay
              node={node}
              isExecuting={executingNodeIds.has(node.id)}
              isCompleted={completedNodeIds.has(node.id)}
              isError={errorExecutionNodeIds.has(node.id)}
            />
            <NodeViewComponent
              node={node}
              isSelected={node.id === selectedNodeId}
              isEditing={node.id === editingNodeId}
              isDragging={node.id === drag.draggingNodeId}
              isBlocking={isBlocking}
              compatiblePortKeys={compatiblePortKeys}
              draggingPortType={draggingPortType}
              draggingPortDirection={draggingPortDirection}
              onMouseDown={(e: React.MouseEvent<SVGGElement>) => handleNodeMouseDown(node.id, e)}
              onDoubleClick={() => onNodeDoubleClick(node.id)}
              onPortMouseDown={(portName: string, portType: 'input' | 'output', e: React.MouseEvent) =>
                connDrag.onPortMouseDown(node.id, portName, portType, e)
              }
              onPortMouseUp={(portName: string, portType: 'input' | 'output') =>
                connDrag.onPortMouseUp(node.id, portName, portType)
              }
            />
          </g>
        ))}

        {tempEdgePath !== null && (
          <path
            d={tempEdgePath}
            fill="none"
            stroke="#00ffff"
            strokeWidth="2"
            strokeDasharray="6 4"
            strokeOpacity="0.8"
          />
        )}
        {editingNode !== undefined && editingNodeId !== null && (
          <ExpressionEditor
            nodeId={editingNodeId}
            nodeRect={editingNode.rect}
            initialExpression={editingNode.expression}
            onCommit={onExpressionCommit}
            onCancel={onExpressionCancel}
          />
        )}
      </svg>

      <Minimap
        nodes={minimapNodes}
        edges={minimapEdges}
        viewport={minimapViewport}
        onPanTo={(x: number, y: number): void => {
          canvas.panTo({ x: x + vbW / 2, y: y + vbH / 2 });
        }}
        canvasWidth={svgDims.width}
        canvasHeight={svgDims.height}
      />
    </div>
  );
}
