'use client';

import type { FieldView } from '../types';

interface FieldViewProps {
  readonly field: FieldView;
}

export function FieldViewComponent({ field }: FieldViewProps): React.ReactElement {
  const typeColor = getTypeColor(field.type);

  return (
    <g>
      <text
        x={field.position.x}
        y={field.position.y}
        fill={typeColor}
        fontSize="11"
        fontFamily="monospace"
      >
        <tspan fill="#888888">{field.name}</tspan>
        <tspan fill="#555555">: </tspan>
        <tspan fill={typeColor}>{field.value}</tspan>
      </text>
    </g>
  );
}

function getTypeColor(type: FieldView['type']): string {
  switch (type) {
    case 'string':
      return '#98c379';
    case 'number':
      return '#d19a66';
    case 'boolean':
      return '#56b6c2';
    case 'object':
      return '#c678dd';
    case 'array':
      return '#e06c75';
    default:
      return '#abb2bf';
  }
}
