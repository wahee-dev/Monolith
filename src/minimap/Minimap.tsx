'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

export interface MinimapProps {
  readonly nodes: ReadonlyArray<{ id: string; x: number; y: number; kind: string; color: string }>;
  readonly edges: ReadonlyArray<{ fromX: number; fromY: number; toX: number; toY: number }>;
  readonly viewport: { x: number; y: number; width: number; height: number };
  readonly onPanTo: (x: number, y: number) => void;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
}

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;
const NODE_RECT_W = 4;
const NODE_RECT_H = 3;

interface ScaleResult {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

function computeScale(
  canvasWidth: number,
  canvasHeight: number,
  nodes: ReadonlyArray<{ x: number; y: number }>,
): ScaleResult {
  if (nodes.length === 0) {
    const scaleX = MINIMAP_WIDTH / canvasWidth;
    const scaleY = MINIMAP_HEIGHT / canvasHeight;
    return { scaleX, scaleY, offsetX: 0, offsetY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x > maxX) maxX = n.x;
    if (n.y > maxY) maxY = n.y;
  }

  const graphW = Math.max(maxX - minX + 40, 200);
  const graphH = Math.max(maxY - minY + 40, 150);

  const padX = Math.max(canvasWidth - (maxX - minX), 40) / 2;
  const padY = Math.max(canvasHeight - (maxY - minY), 40) / 2;

  const effectiveW = canvasWidth > 0 ? canvasWidth : graphW;
  const effectiveH = canvasHeight > 0 ? canvasHeight : graphH;

  const scaleX = MINIMAP_WIDTH / effectiveW;
  const scaleY = MINIMAP_HEIGHT / effectiveH;

  const originX = minX - padX;
  const originY = minY - padY;

  return { scaleX, scaleY, offsetX: -originX, offsetY: -originY };
}

export function Minimap({
  nodes,
  edges,
  viewport,
  onPanTo,
  canvasWidth,
  canvasHeight,
}: MinimapProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; vpX: number; vpY: number } | null>(null);

  const scale = useMemo(
    () => computeScale(canvasWidth, canvasHeight, nodes),
    [canvasWidth, canvasHeight, nodes],
  );

  const scaledNodes = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        mx: (n.x + scale.offsetX) * scale.scaleX,
        my: (n.y + scale.offsetY) * scale.scaleY,
        color: n.color,
      })),
    [nodes, scale],
  );

  const edgeElements = useMemo(
    () =>
      edges.map((e, i) => (
        <line
          key={`e-${i}`}
          x1={(e.fromX + scale.offsetX) * scale.scaleX}
          y1={(e.fromY + scale.offsetY) * scale.scaleY}
          x2={(e.toX + scale.offsetX) * scale.scaleX}
          y2={(e.toY + scale.offsetY) * scale.scaleY}
          stroke="#333"
          strokeWidth={1}
        />
      )),
    [edges, scale],
  );

  const nodeElements = useMemo(
    () =>
      scaledNodes.map((n) => (
        <rect
          key={n.id}
          x={n.mx - NODE_RECT_W / 2}
          y={n.my - NODE_RECT_H / 2}
          width={NODE_RECT_W}
          height={NODE_RECT_H}
          fill={n.color}
        />
      )),
    [scaledNodes],
  );

  const vpRect = useMemo(() => ({
    x: (viewport.x + scale.offsetX) * scale.scaleX,
    y: (viewport.y + scale.offsetY) * scale.scaleY,
    width: viewport.width * scale.scaleX,
    height: viewport.height * scale.scaleY,
  }), [viewport, scale]);

  const zoomPercent = useMemo(() => {
    if (viewport.width <= 0 || canvasWidth <= 0) return 100;
    return Math.round((viewport.width / canvasWidth) * 100);
  }, [viewport.width, canvasWidth]);

  const panFromClick = useCallback(
    (clientX: number, clientY: number): void => {
      if (containerRef.current === null) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const worldX = mx / scale.scaleX - scale.offsetX;
      const worldY = my / scale.scaleY - scale.offsetY;
      onPanTo(worldX - viewport.width / 2, worldY - viewport.height / 2);
    },
    [scale, onPanTo, viewport.width, viewport.height],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        vpX: viewport.x,
        vpY: viewport.y,
      };
    },
    [viewport.x, viewport.y],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging || dragStartRef.current === null) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const worldDx = dx / scale.scaleX;
      const worldDy = dy / scale.scaleY;
      onPanTo(dragStartRef.current.vpX + worldDx, dragStartRef.current.vpY + worldDy);
    },
    [isDragging, scale, onPanTo],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDragging && dragStartRef.current !== null) {
        const dx = Math.abs(e.clientX - dragStartRef.current.startX);
        const dy = Math.abs(e.clientY - dragStartRef.current.startY);
        if (dx < 3 && dy < 3) {
          panFromClick(e.clientX, e.clientY);
        }
      }
      setIsDragging(false);
      dragStartRef.current = null;
    },
    [isDragging, panFromClick],
  );

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 40,
    right: 16,
    width: MINIMAP_WIDTH,
    height: MINIMAP_HEIGHT,
    background: 'rgba(37, 40, 51, 0.85)',
    border: '1px solid #1d1f27',
    borderRadius: 4,
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: 10,
    userSelect: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  };

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 2,
    left: 4,
    fontSize: 10,
    color: '#aaa',
    pointerEvents: 'none',
    zIndex: 1,
  };

  const zoomStyle: React.CSSProperties = {
    position: 'absolute',
    top: 2,
    right: 4,
    fontSize: 10,
    color: '#aaa',
    pointerEvents: 'none',
    zIndex: 1,
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <span style={labelStyle}>
        {nodes.length} nodes · {edges.length} edges
      </span>
      <span style={zoomStyle}>{zoomPercent}%</span>
      <svg
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        viewBox={`0 0 ${MINIMAP_WIDTH} ${MINIMAP_HEIGHT}`}
        style={{ display: 'block' }}
      >
        {edgeElements}
        {nodeElements}
        <rect
          x={vpRect.x}
          y={vpRect.y}
          width={vpRect.width}
          height={vpRect.height}
          fill="rgba(71, 140, 191, 0.2)"
          stroke="#478cbf"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
