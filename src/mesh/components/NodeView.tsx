'use client';

import { useCallback } from 'react';
import type { ExpressionNodeView, Point } from '../types';
import { KIND_COLORS } from '../projector';

interface NodeViewProps {
  readonly node: ExpressionNodeView;
  readonly isSelected: boolean;
  readonly onSelect: (nodeId: string | null) => void;
  readonly onDoubleClick: (nodeId: string) => void;
  readonly zoom: number;
}

const STATUS_COLORS: Record<string, string> = {
  unchecked: '#333333',
  valid: '#00ff88',
  invalid: '#ff4444',
};

const HEADER_HEIGHT = 28;
const PORT_RADIUS = 5;

interface PortInfo {
  readonly name: string;
  readonly pos: Point;
}

function getInputPorts(node: ExpressionNodeView): ReadonlyArray<PortInfo> {
  const half = Math.ceil(node.fields.length / 2);
  const ports: PortInfo[] = [];
  for (let i = 0; i < half; i++) {
    const field = node.fields[i]!;
    ports.push({
      name: field.name,
      pos: { x: node.rect.x, y: node.rect.y + HEADER_HEIGHT + 16 + i * 20 },
    });
  }
  if (ports.length === 0) {
    ports.push({
      name: 'in',
      pos: { x: node.rect.x, y: node.rect.y + node.rect.height / 2 },
    });
  }
  return ports;
}

function getOutputPorts(node: ExpressionNodeView): ReadonlyArray<PortInfo> {
  const half = Math.ceil(node.fields.length / 2);
  const ports: PortInfo[] = [];
  for (let i = half; i < node.fields.length; i++) {
    const field = node.fields[i]!;
    ports.push({
      name: field.name,
      pos: { x: node.rect.x + node.rect.width, y: node.rect.y + HEADER_HEIGHT + 16 + (i - half) * 20 },
    });
  }
  if (ports.length === 0) {
    ports.push({
      name: 'out',
      pos: { x: node.rect.x + node.rect.width, y: node.rect.y + node.rect.height / 2 },
    });
  }
  return ports;
}

export function NodeViewComponent({
  node,
  isSelected,
  onSelect,
  onDoubleClick,
  zoom,
}: NodeViewProps): React.ReactElement {
  const { rect, kind, label, expression, typeStatus, typeError, color } = node;
  const statusColor = STATUS_COLORS[typeStatus] ?? '#333333';
  const kindColor = KIND_COLORS[kind] ?? '#888888';

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(node.id);
    },
    [onSelect, node.id],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick(node.id);
    },
    [onDoubleClick, node.id],
  );

  const inputPorts = getInputPorts(node);
  const outputPorts = getOutputPorts(node);

  const borderStrokeWidth = isSelected ? 2.5 : 1.5;
  const glowFilter = typeStatus === 'valid'
    ? 'drop-shadow(0 0 6px rgba(0,255,136,0.3))'
    : typeStatus === 'invalid'
      ? 'drop-shadow(0 0 6px rgba(255,68,68,0.3))'
      : 'none';

  return (
    <g onClick={handleClick} onDoubleClick={handleDoubleClick} style={{ filter: glowFilter }}>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        rx="6"
        ry="6"
        fill="#12121e"
        stroke={isSelected ? '#4a9eff' : '#2a2a3e'}
        strokeWidth={borderStrokeWidth}
      />
      <rect
        x={rect.x + 1.5}
        y={rect.y + 1.5}
        width={4}
        height={rect.height - 3}
        rx="2"
        fill={statusColor}
      />
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={HEADER_HEIGHT}
        rx="6"
        ry="6"
        fill={kindColor}
        fillOpacity="0.15"
      />
      <rect
        x={rect.x}
        y={rect.y + HEADER_HEIGHT - 6}
        width={rect.width}
        height="6"
        fill={kindColor}
        fillOpacity="0.15"
      />
      <text
        x={rect.x + 10}
        y={rect.y + 18}
        fill={kindColor}
        fontSize="11"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {label}
      </text>
      <line
        x1={rect.x}
        y1={rect.y + HEADER_HEIGHT}
        x2={rect.x + rect.width}
        y2={rect.y + HEADER_HEIGHT}
        stroke={kindColor}
        strokeOpacity="0.3"
        strokeWidth={1 / zoom}
      />
      {expression.length > 0 && (
        <text
          x={rect.x + 14}
          y={rect.y + HEADER_HEIGHT + 18}
          fill="#e0e0e0"
          fontSize="10"
          fontFamily="monospace"
        >
          {expression.length > 22 ? `${expression.slice(0, 22)}...` : expression}
        </text>
      )}
      {typeStatus === 'invalid' && typeError !== null && (
        <text
          x={rect.x + 14}
          y={rect.y + HEADER_HEIGHT + (expression.length > 0 ? 34 : 18)}
          fill="#ff4444"
          fontSize="9"
          fontFamily="monospace"
        >
          {typeError.length > 24 ? `${typeError.slice(0, 24)}...` : typeError}
        </text>
      )}
      {isSelected && (
        <>
          <rect x={rect.x - 3} y={rect.y - 3} width={6} height={6} fill="#4a9eff" rx="1" />
          <rect x={rect.x + rect.width - 3} y={rect.y - 3} width={6} height={6} fill="#4a9eff" rx="1" />
          <rect x={rect.x - 3} y={rect.y + rect.height - 3} width={6} height={6} fill="#4a9eff" rx="1" />
          <rect x={rect.x + rect.width - 3} y={rect.y + rect.height - 3} width={6} height={6} fill="#4a9eff" rx="1" />
        </>
      )}
      {inputPorts.map((port) => (
        <g key={`in-${port.name}`}>
          <circle
            cx={port.pos.x}
            cy={port.pos.y}
            r={PORT_RADIUS}
            fill="#08080f"
            stroke={color}
            strokeWidth={1.5}
          />
          <text
            x={port.pos.x + PORT_RADIUS + 3}
            y={port.pos.y + 3}
            fill="#666666"
            fontSize="8"
            fontFamily="monospace"
          >
            {port.name}
          </text>
        </g>
      ))}
      {outputPorts.map((port) => (
        <g key={`out-${port.name}`}>
          <circle
            cx={port.pos.x}
            cy={port.pos.y}
            r={PORT_RADIUS}
            fill="#08080f"
            stroke={color}
            strokeWidth={1.5}
          />
          <text
            x={port.pos.x - PORT_RADIUS - 3}
            y={port.pos.y + 3}
            fill="#666666"
            fontSize="8"
            fontFamily="monospace"
            textAnchor="end"
          >
            {port.name}
          </text>
        </g>
      ))}
    </g>
  );
}
