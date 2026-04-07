'use client';

import { useCallback, useMemo } from 'react';
import type { MeshView, Point } from '../types';
import type { PortType } from '@engine/types';
import { useInfiniteCanvas } from '../hooks/useInfiniteCanvas';
import { useNodeDrag } from '../hooks/useNodeDrag';
import { useConnectionDrag } from '../hooks/useConnectionDrag';
import { NodeView as NodeViewComponent } from './NodeView';
import { EdgeView } from './EdgeView';
import { ExpressionEditor } from './ExpressionEditor';
import { computeBezierPath } from '../geometry';

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
  readonly onNodeMove: (nodeId: string, newPosition: Point) => void;
  readonly onNodeSelect: (nodeId: string | null) => void;
  readonly onNodeDoubleClick: (nodeId: string) => void;
  readonly onExpressionCommit: (nodeId: string, expression: string) => void;
  readonly onExpressionCancel: () => void;
  readonly onConnectionCreate: (fromNodeId: string, fromPort: string, toNodeId: string, toPort: string) => void;
  readonly onConnectionValidationError?: (fromType: PortType, toType: PortType) => void;
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
          stroke="#1a1a2e"
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
          stroke="#252540"
          strokeWidth="1"
        />
      </pattern>
    </defs>
  );
}

export function MeshCanvas({
  view,
  selectedNodeId,
  selectedEdgeId,
  editingNodeId,
  nodePositions,
  isBlocking,
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
  const svgW = typeof window !== 'undefined' ? window.innerWidth : 800;
  const svgH = typeof window !== 'undefined' ? window.innerHeight : 600;
  const canvas = useInfiniteCanvas(svgW, svgH);
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
    onConnectionValidationError: onConnectionValidationError ?? ((_f: PortType, _t: PortType) => {}),
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

  return (
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
      <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="#08080f" />
      <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#grid-thick)" />
      {recomputedEdges.map((edge) => (
        <g key={edge.id} onClick={(e) => handleEdgeClick(edge.id, e)}>
          <EdgeView edge={edge} isSelected={edge.id === selectedEdgeId} />
        </g>
      ))}
      {positionedNodes.map((node) => (
        <NodeViewComponent
          key={node.id}
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
  );
}
