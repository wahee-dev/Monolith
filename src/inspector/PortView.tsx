'use client';

import type { PortType } from '@engine/types';

interface PortViewProps {
  readonly name: string;
  readonly type: PortType;
  readonly value: unknown;
  readonly isConnected: boolean;
}

const PORT_TYPE_COLORS: Record<PortType, string> = {
  string: '#4a9eff',
  number: '#22c55e',
  boolean: '#f59e0b',
  object: '#9f4aff',
  array: '#ff9f4a',
  any: '#888888',
  void: '#888888',
};

function truncateValue(val: unknown): string {
  const str = typeof val === 'string' ? val : JSON.stringify(val);
  if (str === undefined) {
    return '';
  }
  return str.length > 80 ? str.slice(0, 77) + '...' : str;
}

export function PortView({ name, type, value, isConnected }: PortViewProps): React.ReactElement {
  const color = PORT_TYPE_COLORS[type];
  const displayValue = truncateValue(value);

  return (
    <div
      style={{
        padding: '4px 0',
        borderBottom: '1px solid #1a1a2e',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              border: isConnected ? `2px solid #22c55e` : '2px solid #555',
              backgroundColor: isConnected ? '#22c55e' : 'transparent',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: '#e0e0e0',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            {name}
          </span>
        </div>
        <span
          style={{
            color,
            backgroundColor: `${color}22`,
            padding: '1px 5px',
            borderRadius: '8px',
            fontSize: '9px',
            fontFamily: 'monospace',
          }}
        >
          {type}
        </span>
      </div>
      {displayValue.length > 0 && (
        <div
          style={{
            marginTop: '2px',
            marginLeft: '10px',
            color: '#777',
            fontFamily: 'monospace',
            fontSize: '10px',
            wordBreak: 'break-all',
          }}
        >
          {displayValue}
        </div>
      )}
    </div>
  );
}
