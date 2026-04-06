'use client';

import type { NodeView as NodeViewType } from '../types';
import { FieldViewComponent } from './FieldView';

interface NodeViewProps {
  readonly node: NodeViewType;
}

export function NodeView({ node }: NodeViewProps): React.ReactElement {
  const { rect, label, fields, color } = node;

  return (
    <g>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        rx="6"
        ry="6"
        fill="#1a1a2e"
        stroke={color}
        strokeWidth="2"
      />
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height="28"
        rx="6"
        ry="6"
        fill={color}
        fillOpacity="0.15"
      />
      <rect
        x={rect.x}
        y={rect.y + 22}
        width={rect.width}
        height="6"
        fill={color}
        fillOpacity="0.15"
      />
      <text
        x={rect.x + rect.width / 2}
        y={rect.y + 19}
        fill={color}
        fontSize="12"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        {label}
      </text>
      <line
        x1={rect.x}
        y1={rect.y + 28}
        x2={rect.x + rect.width}
        y2={rect.y + 28}
        stroke={color}
        strokeOpacity="0.3"
      />
      {fields.map((field) => (
        <FieldViewComponent key={`${node.id}-${field.name}`} field={field} />
      ))}
    </g>
  );
}
