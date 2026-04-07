'use client';

import type { NodeView as NodeViewType } from '../types';
import { FieldViewComponent } from './FieldView';

interface NodeViewProps {
  readonly node: NodeViewType;
  readonly isSelected: boolean;
  readonly isEditing: boolean;
  readonly isDragging: boolean;
  readonly onMouseDown: (e: React.MouseEvent<SVGGElement>) => void;
  readonly onDoubleClick: () => void;
}

const STATUS_BORDER_COLORS: Record<string, string> = {
  unchecked: 'transparent',
  valid: '#22c55e',
  invalid: '#ef4444',
};

const PORT_RADIUS = 5;

export function NodeView({
  node,
  isSelected,
  isEditing,
  isDragging,
  onMouseDown,
  onDoubleClick,
}: NodeViewProps): React.ReactElement {
  const { rect, label, fields, color, expression, typeStatus, typeError } = node;

  const selectionFilter = isSelected
    ? 'url(#selection-glow)'
    : undefined;

  const statusBorderColor = STATUS_BORDER_COLORS[typeStatus] ?? 'transparent';

  const expressionLines = expression.length > 0
    ? expression.split('\n')
    : [];

  return (
    <g
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {isSelected && (
        <defs>
          <filter id="selection-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor={color} floodOpacity="0.6" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      {typeStatus === 'invalid' && (
        <defs>
          <filter id={`error-glow-${node.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor="#ef4444" floodOpacity="0.4" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        rx="6"
        ry="6"
        fill="#1a1a2e"
        stroke={isSelected ? color : '#2a2a3e'}
        strokeWidth={isSelected ? '2.5' : '1.5'}
        filter={selectionFilter}
      />
      {typeStatus !== 'unchecked' && (
        <rect
          x={rect.x}
          y={rect.y}
          width="4"
          height={rect.height}
          rx="2"
          ry="2"
          fill={statusBorderColor}
          filter={typeStatus === 'invalid' ? `url(#error-glow-${node.id})` : undefined}
        />
      )}
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
      {expressionLines.length > 0 && !isEditing && (
        <text
          x={rect.x + 10}
          y={rect.y + rect.height - 8}
          fill="#888888"
          fontSize="10"
          fontFamily="monospace"
        >
          {expressionLines[0]!.length > 22
            ? `${expressionLines[0]!.slice(0, 22)}…`
            : expressionLines[0]}
        </text>
      )}
      {typeError.length > 0 && (
        <text
          x={rect.x + rect.width + 8}
          y={rect.y + 14}
          fill="#ef4444"
          fontSize="9"
          fontFamily="monospace"
        >
          {typeError.length > 30 ? `${typeError.slice(0, 30)}…` : typeError}
        </text>
      )}
      <circle
        cx={rect.x}
        cy={rect.y + rect.height / 2}
        r={PORT_RADIUS}
        fill="#08080f"
        stroke="#555555"
        strokeWidth="1.5"
      />
      <circle
        cx={rect.x + rect.width}
        cy={rect.y + rect.height / 2}
        r={PORT_RADIUS}
        fill="#08080f"
        stroke="#555555"
        strokeWidth="1.5"
      />
    </g>
  );
}
