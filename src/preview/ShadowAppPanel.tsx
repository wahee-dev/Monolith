'use client';

import type { ShadowAppState, ShadowScreen, UIElement, PreviewError } from './types';
import type { GraphExecutionResult, ExecutionTrace } from '@engine/types';

const PANEL_WIDTH = 280;

interface ShadowAppPanelProps {
  readonly state: ShadowAppState;
  readonly executionResult: GraphExecutionResult | null;
}

function WireframeElement({ element }: { readonly element: UIElement }): React.ReactElement {
  const borderColor = element.valid ? '#00e5ff' : '#ff4a4a';
  const bgColor = element.kind === 'input' ? '#1a1a2e' : 'transparent';

  return (
    <div style={{
      border: `1px solid ${borderColor}`,
      borderRadius: '2px',
      padding: '2px 6px',
      marginBottom: '2px',
      fontSize: '9px',
      fontFamily: 'monospace',
      color: element.valid ? '#aaaaaa' : '#ff6b6b',
      backgroundColor: bgColor,
      display: 'flex',
      justifyContent: 'space-between',
      gap: '4px',
    }}>
      <span style={{ color: '#666666' }}>{element.label}</span>
      <span style={{ color: element.valid ? '#00e5ff' : '#ff4a4a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {element.kind === 'button' ? (element.value === 'true' ? '\u25CF' : '\u25CB') : element.value}
      </span>
    </div>
  );
}

function ScreenCard({ screen }: { readonly screen: ShadowScreen }): React.ReactElement {
  const borderColor = screen.valid ? '#2a2a3e' : '#ff4a4a33';

  return (
    <div style={{
      backgroundColor: '#14141f',
      border: `1px solid ${borderColor}`,
      borderRadius: '4px',
      padding: '8px',
      marginBottom: '8px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '6px',
        fontSize: '10px',
        fontFamily: 'monospace',
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: screen.valid ? '#00e5ff' : '#ff4a4a',
          flexShrink: 0,
        }} />
        <span style={{ color: '#cccccc', fontWeight: 'bold' }}>{screen.title}</span>
      </div>
      <div style={{ paddingLeft: '4px' }}>
        {screen.elements.map((el) => (
          <WireframeElement key={el.id} element={el} />
        ))}
      </div>
    </div>
  );
}

function ErrorRow({ error }: { readonly error: PreviewError }): React.ReactElement {
  return (
    <div style={{
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#ff6b6b',
      padding: '2px 0',
      borderBottom: '1px solid #1a1a2e',
    }}>
      <span style={{ color: '#ff4a4a' }}>&#10005;</span>
      <span style={{ color: '#888888', marginLeft: '4px' }}>[{error.nodeId.slice(0, 8)}]</span>
      <span style={{ marginLeft: '4px' }}>{error.message}</span>
    </div>
  );
}

function TraceEntry({ trace }: { readonly trace: ExecutionTrace }): React.ReactElement {
  return (
    <div style={{
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#00ffff',
      padding: '2px 0',
      display: 'flex',
      gap: '6px',
    }}>
      <span style={{ color: '#888888' }}>[{trace.nodeId.slice(0, 8)}]</span>
      <span>{trace.portName}</span>
      <span style={{ color: '#555555' }}>{trace.valueType}</span>
    </div>
  );
}

export function ShadowAppPanel({ state, executionResult }: ShadowAppPanelProps): React.ReactElement {
  const statusColor = state.valid ? '#00e5ff' : '#ff4a4a';
  const statusText = state.valid ? 'VALID' : `${state.errors.length} ERRORS`;

  return (
    <div style={{
      width: PANEL_WIDTH,
      minWidth: PANEL_WIDTH,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0c0c14',
      borderLeft: '1px solid #1a1a2e',
      fontFamily: 'monospace',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ color: '#cccccc', fontSize: '11px', fontWeight: 'bold' }}>
          SHADOW PREVIEW
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: statusColor,
          }} />
          <span style={{ color: statusColor, fontSize: '9px' }}>{statusText}</span>
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
      }}>
        {state.screens.length === 0 && (
          <div style={{
            color: '#555555',
            fontSize: '10px',
            textAlign: 'center',
            padding: '24px 8px',
          }}>
            No screens — add nodes to the lattice
          </div>
        )}
        {state.screens.map((screen) => (
          <ScreenCard key={screen.id} screen={screen} />
        ))}

        {state.flows.length > 0 && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#14141f',
            borderRadius: '4px',
            border: '1px solid #2a2a3e',
          }}>
            <div style={{ color: '#888888', fontSize: '9px', marginBottom: '4px' }}>
              DATA FLOWS ({state.flows.length})
            </div>
            {state.flows.map((flow) => (
              <div key={flow.id} style={{
                fontSize: '9px',
                color: '#00e5ff',
                padding: '1px 0',
                fontFamily: 'monospace',
              }}>
                {flow.label}
              </div>
            ))}
          </div>
        )}

        {executionResult !== null && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#14141f',
            borderRadius: '4px',
            border: '1px solid #2a2a3e',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}>
              <span style={{ color: '#888888', fontSize: '9px', fontWeight: 'bold' }}>
                EXECUTION TRACE
              </span>
              <span style={{ color: executionResult.success ? '#22c55e' : '#ef4444', fontSize: '9px' }}>
                {executionResult.success ? 'SUCCESS' : 'FAILED'} &middot; {executionResult.durationMs}ms
              </span>
            </div>
            {executionResult.trace.length === 0 && (
              <span style={{ color: '#555555', fontSize: '9px' }}>No trace entries</span>
            )}
            {executionResult.trace.map((trace, idx) => (
              <TraceEntry key={`trace-${idx}`} trace={trace} />
            ))}
            {executionResult.outputs.size > 0 && (
              <div style={{ marginTop: '6px' }}>
                <span style={{ color: '#888888', fontSize: '9px', display: 'block', marginBottom: '4px' }}>
                  OUTPUTS ({executionResult.outputs.size})
                </span>
                {Array.from(executionResult.outputs.entries()).map(([nodeId, value]) => (
                  <div key={nodeId} style={{
                    fontSize: '9px',
                    padding: '2px 0',
                    borderBottom: '1px solid #1a1a2e',
                  }}>
                    <span style={{ color: '#888888' }}>[{nodeId.slice(0, 8)}]</span>
                    <span style={{ color: '#00e5ff', marginLeft: '4px' }}>
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {state.errors.length > 0 && (
        <div style={{
          borderTop: '1px solid #1a1a2e',
          padding: '8px',
          maxHeight: '160px',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          <div style={{ color: '#ff4a4a', fontSize: '9px', marginBottom: '4px' }}>
            ERRORS
          </div>
          {state.errors.map((error, idx) => (
            <ErrorRow key={`${error.nodeId}-${idx}`} error={error} />
          ))}
        </div>
      )}

      <div style={{
        padding: '6px 16px',
        borderTop: '1px solid #1a1a2e',
        fontSize: '9px',
        color: '#555555',
        display: 'flex',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span>v{state.version}</span>
        <span>{state.screens.length} screens &middot; {state.flows.length} flows</span>
      </div>
    </div>
  );
}
