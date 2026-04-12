'use client';

import type { NodeView as NodeViewType } from '../types';
import { getPortTypeColor } from '../types';
import type { PortType } from '@engine/types';
import { FieldViewComponent } from './FieldView';

interface NodeViewProps {
  readonly node: NodeViewType;
  readonly isSelected: boolean;
  readonly isEditing: boolean;
  readonly isDragging: boolean;
  readonly isBlocking: boolean;
  readonly compatiblePortKeys: ReadonlySet<string> | null;
  readonly draggingPortType: PortType | null;
  readonly draggingPortDirection: 'input' | 'output' | null;
  readonly onMouseDown: (e: React.MouseEvent<SVGGElement>) => void;
  readonly onDoubleClick: () => void;
  readonly onPortMouseDown?: (portName: string, portType: 'input' | 'output', e: React.MouseEvent) => void;
  readonly onPortMouseUp?: (portName: string, portType: 'input' | 'output') => void;
}

const STATUS_BORDER_COLORS: Record<string, string> = {
  unchecked: 'transparent',
  valid: '#22c55e',
  invalid: '#ef4444',
};

const PORT_RADIUS = 6;

export function NodeView({
  node,
  isSelected,
  isEditing,
  isDragging,
  isBlocking,
  compatiblePortKeys,
  draggingPortType,
  draggingPortDirection,
  onMouseDown,
  onDoubleClick,
  onPortMouseDown,
  onPortMouseUp,
}: NodeViewProps): React.ReactElement {
  const { rect, label, fields, ports, color, expression, typeStatus, typeError } = node;

  const inputPorts = ports.filter((p) => p.direction === 'input');
  const outputPorts = ports.filter((p) => p.direction === 'output');

  const selectionFilter = isSelected
    ? 'url(#selection-glow)'
    : undefined;

  const statusBorderColor = STATUS_BORDER_COLORS[typeStatus] ?? 'transparent';

  const expressionLines = expression.length > 0
    ? expression.split('\n')
    : [];

  const isDragActive = draggingPortType !== null && draggingPortDirection !== null;
  const targetDirection = isDragActive
    ? (draggingPortDirection === 'output' ? 'input' : 'output')
    : null;

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
      {typeStatus === 'valid' && (
        <defs>
          <filter id={`valid-glow-${node.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#22c55e" floodOpacity="0.4" />
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
      {typeStatus === 'invalid' && isBlocking && (
        <rect
          x={rect.x - 4}
          y={rect.y - 4}
          width={rect.width + 8}
          height={rect.height + 8}
          rx="10"
          ry="10"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          strokeOpacity="0.6"
        >
          <animate
            attributeName="strokeOpacity"
            values="0.6;0.1;0.6"
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="strokeWidth"
            values="2;4;2"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </rect>
      )}
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        rx="4"
        ry="4"
        fill="#252833"
        stroke={isSelected ? '#478cbf' : '#1d1f27'}
        strokeWidth={isSelected ? '2' : '1'}
        filter={selectionFilter}
        box-shadow="0 4px 12px rgba(0,0,0,0.5)"
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
          filter={
            typeStatus === 'invalid'
              ? `url(#error-glow-${node.id})`
              : typeStatus === 'valid'
                ? `url(#valid-glow-${node.id})`
                : undefined
          }
        >
          {typeStatus === 'invalid' && (
            <animate
              attributeName="opacity"
              values="1;0.4;1"
              dur="1.5s"
              repeatCount="indefinite"
            />
          )}
        </rect>
      )}
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height="26"
        rx="4"
        ry="4"
        fill="#2b2e3b"
      />
      <rect
        x={rect.x}
        y={rect.y + 20}
        width={rect.width}
        height="6"
        fill="#2b2e3b"
      />
      <rect
        x={rect.x}
        y={rect.y}
        width="4"
        height="26"
        fill={color}
        rx="2"
      />
      <text
        x={rect.x + 12}
        y={rect.y + 17}
        fill="#e0e0e0"
        fontSize="11"
        fontFamily="system-ui"
        fontWeight="600"
        textAnchor="start"
      >
        {label}
      </text>
      <line
        x1={rect.x}
        y1={rect.y + 26}
        x2={rect.x + rect.width}
        y2={rect.y + 26}
        stroke="#1d1f27"
        strokeWidth="1"
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
      {inputPorts.map((port) => {
        const portColor = getPortTypeColor(port.type);
        const portKey = `${node.id}:${port.name}:input`;
        const isCompatible = isDragActive && targetDirection === 'input' && compatiblePortKeys?.has(portKey) === true;
        return (
          <circle
            key={`in-${port.name}`}
            cx={port.position.x}
            cy={port.position.y}
            r={PORT_RADIUS}
            fill={port.type === 'void' ? '#08080f' : (isSelected || isDragging || port.isConnected ? portColor : '#08080f')}
            stroke={portColor}
            strokeWidth="1.5"
            style={{ cursor: 'crosshair' }}
            onMouseDown={(e: React.MouseEvent) => {
              e.stopPropagation();
              onPortMouseDown?.(port.name, 'input', e);
            }}
            onMouseUp={() => onPortMouseUp?.(port.name, 'input')}
          >
            <title>{`${port.name} (${port.type}, input)`}</title>
            {isCompatible && (
              <animate
                attributeName="r"
                values={`${PORT_RADIUS};${PORT_RADIUS + 3};${PORT_RADIUS}`}
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
            {isCompatible && (
              <animate
                attributeName="strokeWidth"
                values="1.5;3;1.5"
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        );
      })}
      {outputPorts.map((port) => {
        const portColor = getPortTypeColor(port.type);
        const portKey = `${node.id}:${port.name}:output`;
        const isCompatible = isDragActive && targetDirection === 'output' && compatiblePortKeys?.has(portKey) === true;
        const isIncompatible = isDragActive && targetDirection === 'output' && compatiblePortKeys !== null && !compatiblePortKeys.has(portKey);
        return (
          <circle
            key={`out-${port.name}`}
            cx={port.position.x}
            cy={port.position.y}
            r={PORT_RADIUS}
            fill={port.type === 'void' ? '#08080f' : (isSelected || isDragging || port.isConnected ? portColor : '#08080f')}
            stroke={portColor}
            strokeWidth={isIncompatible ? '1' : '1.5'}
            strokeOpacity={isIncompatible ? 0.3 : 1}
            style={{ cursor: 'crosshair' }}
            onMouseDown={(e: React.MouseEvent) => {
              e.stopPropagation();
              onPortMouseDown?.(port.name, 'output', e);
            }}
            onMouseUp={() => onPortMouseUp?.(port.name, 'output')}
          >
            <title>{`${port.name} (${port.type}, output)`}</title>
            {isCompatible && (
              <animate
                attributeName="r"
                values={`${PORT_RADIUS};${PORT_RADIUS + 3};${PORT_RADIUS}`}
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
            {isCompatible && (
              <animate
                attributeName="strokeWidth"
                values="1.5;3;1.5"
                dur="0.8s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        );
      })}
    </g>
  );
}
