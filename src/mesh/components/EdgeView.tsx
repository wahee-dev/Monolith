'use client';

import type { EdgeView as EdgeViewType } from '../types';

interface EdgeViewProps {
  readonly edge: EdgeViewType;
  readonly isSelected?: boolean;
}

export function EdgeView({ edge, isSelected }: EdgeViewProps): React.ReactElement {
  const { curve } = edge;
  const path = `M ${curve.start.x} ${curve.start.y} C ${curve.control1.x} ${curve.control1.y}, ${curve.control2.x} ${curve.control2.y}, ${curve.end.x} ${curve.end.y}`;

  const midX = (curve.start.x + curve.end.x) / 2;
  const midY = (curve.start.y + curve.end.y) / 2;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={isSelected === true ? '#f59e0b' : edge.color}
        strokeWidth={isSelected === true ? '3' : '2'}
        strokeOpacity={isSelected === true ? '0.9' : '0.6'}
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
