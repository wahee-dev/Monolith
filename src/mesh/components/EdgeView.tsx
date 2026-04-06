'use client';

import type { EdgeView as EdgeViewType } from '../types';

interface EdgeViewProps {
  readonly edge: EdgeViewType;
}

export function EdgeView({ edge }: EdgeViewProps): React.ReactElement {
  const { curve } = edge;
  const path = `M ${curve.start.x} ${curve.start.y} C ${curve.control1.x} ${curve.control1.y}, ${curve.control2.x} ${curve.control2.y}, ${curve.end.x} ${curve.end.y}`;

  const midX = (curve.start.x + curve.end.x) / 2;
  const midY = (curve.start.y + curve.end.y) / 2;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={edge.color}
        strokeWidth="2"
        strokeOpacity="0.6"
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
