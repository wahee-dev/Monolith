'use client';

import { useState, useCallback } from 'react';
import type { NodeSchema, SchemaField } from '@lattice/types';

type PortDirection = 'input' | 'output';

interface PortEntry {
  readonly direction: PortDirection;
  readonly name: string;
  readonly type: SchemaField['type'];
  readonly required: boolean;
}

interface SchemaEditorProps {
  readonly schema: NodeSchema;
  readonly onSchemaChange: (schema: NodeSchema) => void;
}

const TYPE_OPTIONS: ReadonlyArray<SchemaField['type']> = [
  'string',
  'number',
  'boolean',
  'object',
  'array',
];

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: '#1a1a2e',
  color: '#e0e0e0',
  border: '1px solid #2a2a3e',
  borderRadius: '3px',
  padding: '4px 6px',
  fontFamily: 'monospace',
  fontSize: '11px',
  outline: 'none',
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  cursor: 'pointer',
};

function schemaToEntries(schema: NodeSchema): ReadonlyArray<PortEntry> {
  const entries: PortEntry[] = [];
  const inputKeys = Object.keys(schema.input);
  for (let i = 0; i < inputKeys.length; i++) {
    const key = inputKeys[i]!;
    const field = schema.input[key]!;
    entries.push({
      direction: 'input',
      name: field.name,
      type: field.type,
      required: field.required,
    });
  }
  const outputKeys = Object.keys(schema.output);
  for (let i = 0; i < outputKeys.length; i++) {
    const key = outputKeys[i]!;
    const field = schema.output[key]!;
    entries.push({
      direction: 'output',
      name: field.name,
      type: field.type,
      required: field.required,
    });
  }
  return entries;
}

function entriesToSchema(entries: ReadonlyArray<PortEntry>): NodeSchema {
  const input: Record<string, SchemaField> = {};
  const output: Record<string, SchemaField> = {};
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const field: SchemaField = {
      name: entry.name,
      type: entry.type,
      required: true,
    };
    if (entry.direction === 'input') {
      input[entry.name] = field;
    } else {
      output[entry.name] = field;
    }
  }
  return { input, output };
}

export function SchemaEditor({ schema, onSchemaChange }: SchemaEditorProps): React.ReactElement {
  const [entries, setEntries] = useState<ReadonlyArray<PortEntry>>(() => schemaToEntries(schema));
  const [newDirection, setNewDirection] = useState<PortDirection>('input');

  const updateEntry = useCallback(
    (index: number, updates: Partial<PortEntry>): void => {
      const next = entries.map((entry, i) =>
        i === index ? { ...entry, ...updates } : entry,
      );
      setEntries(next);
      onSchemaChange(entriesToSchema(next));
    },
    [entries, onSchemaChange],
  );

  const removeEntry = useCallback(
    (index: number): void => {
      const next = entries.filter((_, i) => i !== index);
      setEntries(next);
      onSchemaChange(entriesToSchema(next));
    },
    [entries, onSchemaChange],
  );

  const addEntry = useCallback((): void => {
    const newName = `port${entries.length}`;
    const newEntry: PortEntry = {
      direction: newDirection,
      name: newName,
      type: 'string',
      required: true,
    };
    const next = [...entries, newEntry];
    setEntries(next);
    onSchemaChange(entriesToSchema(next));
  }, [entries, newDirection, onSchemaChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0 4px 0',
        }}
      >
        <span
          style={{
            color: '#e0e0e0',
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Schema
        </span>
      </div>

      {entries.map((entry, index) => (
        <div
          key={`${entry.direction}-${entry.name}-${index}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px',
            backgroundColor: '#14141f',
            borderRadius: '3px',
            border: '1px solid #2a2a3e',
          }}
        >
          <span
            style={{
              color: entry.direction === 'input' ? '#4a9eff' : '#22c55e',
              fontSize: '9px',
              fontFamily: 'monospace',
              width: '14px',
              flexShrink: 0,
            }}
          >
            {entry.direction === 'input' ? 'IN' : 'OUT'}
          </span>
          <input
            type="text"
            value={entry.name}
            onChange={(e): void => {
              updateEntry(index, { name: e.target.value });
            }}
            style={{ ...INPUT_STYLE, width: '60px', flexShrink: 0 }}
          />
          <select
            value={entry.type}
            onChange={(e): void => {
              updateEntry(index, { type: e.target.value as SchemaField['type'] });
            }}
            style={{ ...SELECT_STYLE, width: '70px', flexShrink: 0 }}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '10px',
              color: '#888888',
              fontFamily: 'monospace',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={entry.required}
              onChange={(e): void => {
                updateEntry(index, { required: e.target.checked });
              }}
              style={{ cursor: 'pointer' }}
            />
            req
          </label>
          <button
            type="button"
            onClick={(): void => removeEntry(index)}
            style={{
              backgroundColor: 'transparent',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '2px 6px',
              fontFamily: 'monospace',
              flexShrink: 0,
            }}
          >
            x
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <select
          value={newDirection}
          onChange={(e): void => setNewDirection(e.target.value as PortDirection)}
          style={{ ...SELECT_STYLE, width: '60px', flexShrink: 0 }}
        >
          <option value="input">input</option>
          <option value="output">output</option>
        </select>
        <button
          type="button"
          onClick={addEntry}
          style={{
            backgroundColor: '#14141f',
            color: '#4a9eff',
            border: '1px solid #4a9eff',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px',
            padding: '4px 10px',
            fontFamily: 'monospace',
            flex: 1,
          }}
        >
          + Add Port
        </button>
      </div>
    </div>
  );
}
