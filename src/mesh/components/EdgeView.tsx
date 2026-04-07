'use client';

import type { EdgeView as EdgeViewType } from '../types';

interface EdgeViewProps {
  readonly edge: EdgeViewType;
  readonly isSelected?: boolean;
}

function computeArrowPoints(
  endX: number,
  endY: number,
  controlX: number,
  controlY: number,
  size: number,
): { readonly tip: { readonly x: number; readonly y: number }; readonly left: { readonly x: number; readonly y: number }; readonly right: { readonly x: number; readonly y: number } } {
  const dx = endX - controlX;
  const dy = endY - controlY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    return {
      tip: { x: endX, y: endY },
      left: { x: endX - size, y: endY - size * 0.6 },
      right: { x: endX - size, y: endY + size * 0.6 },
    };
  }
  const nx = dx / len;
  const ny = dy / len;
  const tipX = endX;
  const tipY = endY;
  const baseX = endX - nx * size;
  const baseY = endY - ny * size;
  const perpX = -ny;
  const perpY = nx;
  return {
    tip: { x: tipX, y: tipY },
    left: { x: baseX + perpX * size * 0.4, y: baseY + perpY * size * 0.4 },
    right: { x: baseX - perpX * size * 0.4, y: baseY - perpY * size * 0.4 },
  };
}

export function EdgeView({ edge, isSelected }: EdgeViewProps): React.ReactElement {
  const { curve } = edge;
  const path = `M ${curve.start.x} ${curve.start.y} C ${curve.control1.x} ${curve.control1.y}, ${curve.control2.x} ${curve.control2.y}, ${curve.end.x} ${curve.end.y}`;

  const midX = (curve.start.x + curve.end.x) / 2;
  const midY = (curve.start.y + curve.end.y) / 2;

  const arrowSize = 8;
  const arrow = computeArrowPoints(
    curve.end.x,
    curve.end.y,
    curve.control2.x,
    curve.control2.y,
    arrowSize,
  );
  const arrowPath = `M ${arrow.tip.x} ${arrow.tip.y} L ${arrow.left.x} ${arrow.left.y} L ${arrow.right.x} ${arrow.right.y} Z`;

  const strokeColor = isSelected === true ? '#f59e0b' : edge.color;
  const strokeOpacity = isSelected === true ? 0.9 : 0.6;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isSelected === true ? '3' : '2'}
        strokeOpacity={strokeOpacity}
      />
      <path
        d={arrowPath}
        fill={strokeColor}
        fillOpacity={strokeOpacity}
      />
      <text
        x={midX}
        y={midY - 8}
        fill="#555555"
        fontSize="9"
        fontFamily="monospace"
        textAnchor="middle"
      >
        {edge.label}
      </text>
    </g>
  );
}
