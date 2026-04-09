'use client';

import { useState, useCallback } from 'react';
import type { NodeSchema } from '@lattice/types';
import type { NodeCategory } from '@engine/types';
import { PortView } from './PortView';
import { SchemaEditor } from './SchemaEditor';
import type { InspectorState } from './types';

interface InspectorPanelProps {
  readonly inspectorState: InspectorState;
  readonly onExpressionChange: (expression: string) => void;
  readonly onExpressionCommit: (expression: string) => void;
  readonly onSchemaChange: (schema: NodeSchema) => void;
  readonly onClose: () => void;
  readonly onNameComponent?: (name: string) => void;
}

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  data: '#4a9eff',
  logic: '#ff9f4a',
  transform: '#9f4aff',
  io: '#4aff9f',
  ui: '#ff4a9f',
  flow: '#9fff4a',
};

function formatOutput(output: unknown): string {
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

export function InspectorPanel({
  inspectorState,
  onExpressionChange,
  onExpressionCommit,
  onSchemaChange,
  onClose,
  onNameComponent,
}: InspectorPanelProps): React.ReactElement {
  const [outputExpanded, setOutputExpanded] = useState<boolean>(false);
  const [expressionText, setExpressionText] = useState<string>(inspectorState.expression);
  const [expressionValid, setExpressionValid] = useState<boolean>(true);

  const { nodeDefinition, executionOutput, executionError, lastExecutionTime, portValues, validationErrors } =
    inspectorState;

  const handleExpressionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      const value = e.target.value;
      setExpressionText(value);
      onExpressionChange(value);
      setExpressionValid(value.trim().length === 0 || value.length > 0);
    },
    [onExpressionChange],
  );

  const handleExpressionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onExpressionCommit(expressionText);
      }
    },
    [expressionText, onExpressionCommit],
  );

  const hasDefinition = nodeDefinition !== null;

  return (
    <div
      style={{
        width: '260px',
        height: '100%',
        backgroundColor: '#0c0c14',
        borderLeft: '1px solid #2a2a3e',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {hasDefinition ? (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px',
              borderBottom: '1px solid #2a2a3e',
              backgroundColor: '#14141f',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  color: '#e0e0e0',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                }}
              >
                {nodeDefinition.label}
              </span>
              <span
                style={{
                  color: CATEGORY_COLORS[nodeDefinition.category],
                  backgroundColor: `${CATEGORY_COLORS[nodeDefinition.category]}22`,
                  padding: '1px 6px',
                  borderRadius: '8px',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                }}
              >
                {nodeDefinition.category}
              </span>
            </div>
            {onNameComponent && (
              <button
                type="button"
                onClick={(): void => {
                  const name = prompt('Enter component name:');
                  if (name && name.trim()) {
                    onNameComponent(name.trim());
                  }
                }}
                style={{
                  backgroundColor: '#1a1a2e',
                  color: '#00ffff',
                  border: '1px solid #00ffff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '9px',
                  padding: '2px 6px',
                  fontFamily: 'monospace',
                }}
              >
                + Component
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                color: '#888888',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px',
                fontFamily: 'monospace',
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0',
            }}
          >
            <div style={{ padding: '8px', borderBottom: '1px solid #2a2a3e' }}>
              <span
                style={{
                  color: '#666',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Description
              </span>
              <p
                style={{
                  color: '#ccc',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  margin: '2px 0 0 0',
                  lineHeight: 1.4,
                }}
              >
                {nodeDefinition.description}
              </p>
            </div>

            {(nodeDefinition.inputs.length > 0 || nodeDefinition.outputs.length > 0) && (
              <div style={{ padding: '8px', borderBottom: '1px solid #2a2a3e' }}>
                <span
                  style={{
                    color: '#666',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Ports
                </span>
                <div style={{ marginTop: '4px' }}>
                  {nodeDefinition.inputs.length > 0 && (
                    <div style={{ marginBottom: '4px' }}>
                      <span
                        style={{
                          color: '#4a9eff',
                          fontSize: '9px',
                          fontFamily: 'monospace',
                          textTransform: 'uppercase',
                        }}
                      >
                        Inputs
                      </span>
                      {nodeDefinition.inputs.map((port) => (
                        <PortView
                          key={port.name}
                          name={port.name}
                          type={port.type}
                          value={portValues.get(port.name)}
                          isConnected={portValues.has(port.name)}
                        />
                      ))}
                    </div>
                  )}
                  {nodeDefinition.outputs.length > 0 && (
                    <div>
                      <span
                        style={{
                          color: '#22c55e',
                          fontSize: '9px',
                          fontFamily: 'monospace',
                          textTransform: 'uppercase',
                        }}
                      >
                        Outputs
                      </span>
                      {nodeDefinition.outputs.map((port) => (
                        <PortView
                          key={port.name}
                          name={port.name}
                          type={port.type}
                          value={portValues.get(port.name)}
                          isConnected={portValues.has(port.name)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ padding: '8px', borderBottom: '1px solid #2a2a3e' }}>
              <span
                style={{
                  color: '#666',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Expression
              </span>
              <textarea
                value={expressionText}
                onChange={handleExpressionChange}
                onKeyDown={handleExpressionKeyDown}
                placeholder="Enter expression..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  backgroundColor: '#1a1a2e',
                  color: '#e0e0e0',
                  border: `1px solid ${expressionValid ? '#2a2a3e' : '#ef4444'}`,
                  borderRadius: '4px',
                  padding: '6px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '4px',
                }}
              >
                <span
                  style={{
                    color: expressionValid ? '#22c55e' : '#ef4444',
                    fontSize: '9px',
                    fontFamily: 'monospace',
                  }}
                >
                  {expressionValid ? 'Ctrl+Enter to commit' : 'Invalid expression'}
                </span>
              </div>
            </div>

            {nodeDefinition.editableSchema && (
              <div style={{ padding: '8px', borderBottom: '1px solid #2a2a3e' }}>
                <SchemaEditor
                  schema={{
                    input: Object.fromEntries(
                      nodeDefinition.inputs.map((p) => [
                        p.name,
                        { name: p.name, type: p.type as 'string' | 'number' | 'boolean' | 'object' | 'array', required: true as const },
                      ]),
                    ),
                    output: Object.fromEntries(
                      nodeDefinition.outputs.map((p) => [
                        p.name,
                        { name: p.name, type: p.type as 'string' | 'number' | 'boolean' | 'object' | 'array', required: true as const },
                      ]),
                    ),
                  }}
                  onSchemaChange={onSchemaChange}
                />
              </div>
            )}

            <div style={{ padding: '8px', borderBottom: '1px solid #2a2a3e' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={(): void => setOutputExpanded(!outputExpanded)}
                onKeyDown={(e): void => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setOutputExpanded(!outputExpanded);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span
                  style={{
                    color: '#666',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Output
                </span>
                <span
                  style={{
                    color: '#666',
                    fontSize: '9px',
                    fontFamily: 'monospace',
                  }}
                >
                  {outputExpanded ? '\u25BC' : '\u25B6'}
                </span>
              </div>
              {lastExecutionTime > 0 && (
                <span
                  style={{
                    color: '#666',
                    fontSize: '9px',
                    fontFamily: 'monospace',
                    display: 'block',
                    marginTop: '1px',
                  }}
                >
                  {lastExecutionTime}ms
                </span>
              )}
              {executionError.length > 0 && (
                <div
                  style={{
                    color: '#ef4444',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    marginTop: '3px',
                    padding: '4px',
                    backgroundColor: '#1a0a0a',
                    borderRadius: '3px',
                    border: '1px solid #ef4444',
                  }}
                >
                  {executionError}
                </div>
              )}
              {outputExpanded && executionOutput !== undefined && (
                <pre
                  style={{
                    color: '#e0e0e0',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    margin: '4px 0 0 0',
                    padding: '6px',
                    backgroundColor: '#14141f',
                    borderRadius: '3px',
                    border: '1px solid #2a2a3e',
                    maxHeight: '160px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {formatOutput(executionOutput)}
                </pre>
              )}
            </div>

            {validationErrors.length > 0 && (
              <div style={{ padding: '8px' }}>
                <span
                  style={{
                    color: '#ef4444',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Errors ({validationErrors.length})
                </span>
                {validationErrors.map((error, index) => (
                  <div
                    key={`error-${index}`}
                    style={{
                      color: '#ef4444',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      padding: '3px 5px',
                      backgroundColor: '#1a0a0a',
                      borderRadius: '3px',
                      border: '1px solid #2a2a3e',
                      marginBottom: '3px',
                    }}
                  >
                    {error}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <span
            style={{
              color: '#888888',
              fontSize: '12px',
              fontFamily: 'monospace',
              textAlign: 'center',
            }}
          >
            Select a node to inspect
          </span>
        </div>
      )}
    </div>
  );
}
