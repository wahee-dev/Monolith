'use client';

import type { NodeTypeDefinition, NodeCategory } from '@engine/types';

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  data: '#4a9eff',
  logic: '#ff9f4a',
  transform: '#9f4aff',
  io: '#4aff9f',
  flow: '#9fff4a',
  ui: '#ff4a9f',
  state: '#4aafff',
};

interface NodeCardProps {
  readonly definition: NodeTypeDefinition;
  readonly onAddNode: (kind: string) => void;
}

export function NodeCard({ definition, onAddNode }: NodeCardProps): React.ReactElement {
  const categoryColor = CATEGORY_COLORS[definition.category];
  const inputCount = definition.inputs.length;
  const outputCount = definition.outputs.length;

  const handleClick = (): void => {
    onAddNode(definition.kind);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>): void => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAddNode(definition.kind);
        }
      }}
      style={{
        height: '34px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0 8px',
        cursor: 'pointer',
        borderLeft: `3px solid ${categoryColor}`,
        backgroundColor: '#1a1a2e',
        transition: 'background-color 0.15s',
        boxSizing: 'border-box',
        fontFamily: 'monospace',
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>): void => {
        const target = e.currentTarget;
        target.style.backgroundColor = '#222240';
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>): void => {
        const target = e.currentTarget;
        target.style.backgroundColor = '#1a1a2e';
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              color: categoryColor,
              fontSize: '11px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {definition.label}
          </span>
        </div>
        <span
          style={{
            color: '#777',
            fontSize: '9px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
          }}
        >
          {definition.description}
        </span>
      </div>
      <span
        style={{
          color: '#666',
          fontSize: '9px',
          fontFamily: 'monospace',
          flexShrink: 0,
        }}
      >
        {inputCount}&rarr;{outputCount}
      </span>
    </div>
  );
}
