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
        padding: '6px 0',
        borderBottom: '1px solid #2a2a3e',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
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
              fontSize: '12px',
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
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '10px',
            fontFamily: 'monospace',
          }}
        >
          {type}
        </span>
      </div>
      {displayValue.length > 0 && (
        <div
          style={{
            marginTop: '4px',
            marginLeft: '14px',
            color: '#888888',
            fontFamily: 'monospace',
            fontSize: '11px',
            wordBreak: 'break-all',
          }}
        >
          {displayValue}
        </div>
      )}
    </div>
  );
}
