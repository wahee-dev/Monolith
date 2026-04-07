'use client';

import { useCallback, useMemo } from 'react';
import type { MeshView, Point } from '../types';
import { useInfiniteCanvas } from '../hooks/useInfiniteCanvas';
import { useNodeDrag } from '../hooks/useNodeDrag';
import { NodeView as NodeViewComponent } from './NodeView';
import { EdgeView } from './EdgeView';
import { computeBezierPath } from '../geometry';

interface MeshCanvasProps {
  readonly view: MeshView;
  readonly selectedNodeId: string | null;
  readonly editingNodeId: string | null;
  readonly nodePositions: ReadonlyMap<string, Point>;
  readonly onNodeMove: (nodeId: string, newPosition: Point) => void;
  readonly onNodeSelect: (nodeId: string | null) => void;
  readonly onNodeDoubleClick: (nodeId: string) => void;
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
  editingNodeId,
  nodePositions,
  onNodeMove,
  onNodeSelect,
  onNodeDoubleClick,
}: MeshCanvasProps): React.ReactElement {
  const svgW = typeof window !== 'undefined' ? window.innerWidth : 800;
  const svgH = typeof window !== 'undefined' ? window.innerHeight : 600;
  const canvas = useInfiniteCanvas(svgW, svgH);
  const drag = useNodeDrag({
    canvasState: canvas.canvasState,
    nodePositions,
    onNodeMove,
  });

  const positionedNodes = useMemo(() => {
    return view.nodes.map((node) => {
      const pos = nodePositions.get(node.id);
      if (pos !== undefined) {
        return { ...node, rect: { ...node.rect, x: pos.x, y: pos.y } };
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
    },
    [canvas.svgProps, drag],
  );

  const handleSvgMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>): void => {
      canvas.svgProps.onMouseUp(e);
      drag.onCanvasMouseUp();
    },
    [canvas.svgProps, drag],
  );

  const handleNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent<SVGGElement>): void => {
      onNodeSelect(nodeId);
      drag.onNodeMouseDown(nodeId, e);
    },
    [onNodeSelect, drag],
  );

  const vb = canvas.svgProps.viewBox.split(' ');
  const vbX = Number(vb[0] ?? 0);
  const vbY = Number(vb[1] ?? 0);
  const vbW = Number(vb[2] ?? 800);
  const vbH = Number(vb[3] ?? 600);

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
        <EdgeView key={edge.id} edge={edge} />
      ))}
      {positionedNodes.map((node) => (
        <NodeViewComponent
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          isEditing={node.id === editingNodeId}
          isDragging={node.id === drag.draggingNodeId}
          onMouseDown={(e: React.MouseEvent<SVGGElement>) => handleNodeMouseDown(node.id, e)}
          onDoubleClick={() => onNodeDoubleClick(node.id)}
        />
      ))}
    </svg>
  );
}
