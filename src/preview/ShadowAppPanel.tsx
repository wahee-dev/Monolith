'use client';

import { useMemo } from 'react';
import type { LatticeState } from '@lattice/types';
import type { UIElement, ShadowAppState } from './types';
import { projectShadowApp } from './projector';

interface ShadowAppPanelProps {
  readonly latticeState: LatticeState;
  readonly expressions: ReadonlyMap<string, string>;
}

function renderTextElement(element: UIElement & { readonly kind: 'text' }): React.ReactElement {
  return (
    <div
      key={`text-${element.content}`}
      style={{
        padding: `${element.style.padding}px`,
        margin: `${element.style.margin}px`,
        color: element.style.color,
        fontSize: '11px',
        fontFamily: 'monospace',
      }}
    >
      {element.content}
    </div>
  );
}

function renderInputElement(element: UIElement & { readonly kind: 'input' }): React.ReactElement {
  return (
    <div
      key={`input-${element.label}-${element.boundTo}`}
      style={{ margin: '2px 0', display: 'flex', flexDirection: 'column', gap: '2px' }}
    >
      <span style={{ fontSize: '9px', color: '#888888', fontFamily: 'monospace' }}>
        {element.label}
      </span>
      <div
        style={{
          height: '18px',
          border: '1px solid #2a2a3e',
          borderRadius: '2px',
          backgroundColor: '#0a0a14',
        }}
      />
    </div>
  );
}

function renderButtonElement(element: UIElement & { readonly kind: 'button' }): React.ReactElement {
  const bgMap: Record<string, string> = {
    primary: '#1a5fb4',
    secondary: '#3a3a4e',
    danger: '#b41a2a',
  };
  const bg = bgMap[element.variant] ?? '#3a3a4e';

  return (
    <div
      key={`button-${element.label}-${element.action}`}
      style={{
        padding: '4px 8px',
        margin: '2px 0',
        backgroundColor: bg,
        borderRadius: '2px',
        fontSize: '10px',
        color: '#e0e0e0',
        fontFamily: 'monospace',
        textAlign: 'center',
        width: 'fit-content',
      }}
    >
      {element.label}
    </div>
  );
}

function renderListElement(element: UIElement & { readonly kind: 'list' }): React.ReactElement {
  const items: React.ReactElement[] = [];
  for (let i = 0; i < 3; i++) {
    items.push(
      <div
        key={`list-${element.items}-item-${i}`}
        style={{
          height: '12px',
          backgroundColor: '#1a1a2e',
          borderRadius: '1px',
          margin: '2px 0',
          border: '1px solid #2a2a3e',
        }}
      />,
    );
  }

  return (
    <div key={`list-${element.items}`} style={{ margin: '2px 0' }}>
      <span style={{ fontSize: '9px', color: '#888888', fontFamily: 'monospace' }}>
        {element.items} ({element.itemType}[])
      </span>
      {items}
    </div>
  );
}

function renderContainerElement(element: UIElement & { readonly kind: 'container' }): React.ReactElement {
  return (
    <div
      key={`container-${element.direction}-${element.children.length}`}
      style={{
        display: 'flex',
        flexDirection: element.direction === 'row' ? 'row' : 'column',
        gap: '4px',
        padding: '4px',
        border: '1px dashed #2a2a3e',
        borderRadius: '2px',
      }}
    >
      {element.children.map((child, idx) => (
        <UIElementRenderer key={`child-${idx}`} element={child} />
      ))}
    </div>
  );
}

function UIElementRenderer({ element }: { readonly element: UIElement }): React.ReactElement {
  switch (element.kind) {
    case 'text':
      return renderTextElement(element);
    case 'input':
      return renderInputElement(element);
    case 'button':
      return renderButtonElement(element);
    case 'list':
      return renderListElement(element);
    case 'container':
      return renderContainerElement(element);
  }
}

function ScreenCard({
  screen,
  hasError,
  connectedFrom,
}: {
  readonly screen: ShadowAppState['screens'][number];
  readonly hasError: boolean;
  readonly connectedFrom: ReadonlyArray<string>;
}): React.ReactElement {
  return (
    <div
      style={{
        backgroundColor: '#14141f',
        border: hasError ? '1px solid #ff4444' : '1px solid #2a2a3e',
        borderRadius: '4px',
        padding: '8px',
        margin: '4px 0',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          color: '#4aff9f',
          fontFamily: 'monospace',
          marginBottom: '6px',
          fontWeight: 'bold',
        }}
      >
        {screen.label}
      </div>
      {connectedFrom.length > 0 && (
        <div style={{ fontSize: '8px', color: '#00bcd4', fontFamily: 'monospace', marginBottom: '4px' }}>
          ← {connectedFrom.join(', ')}
        </div>
      )}
      {screen.elements.map((element, idx) => (
        <UIElementRenderer key={`el-${idx}`} element={element} />
      ))}
    </div>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <div
      style={{
        padding: '16px',
        textAlign: 'center',
        color: '#555555',
        fontSize: '11px',
        fontFamily: 'monospace',
      }}
    >
      No sink nodes yet. Add sink nodes to the lattice to generate preview screens.
    </div>
  );
}

export function ShadowAppPanel({ latticeState, expressions }: ShadowAppPanelProps): React.ReactElement {
  const shadowApp = useMemo(
    () => projectShadowApp(latticeState, expressions),
    [latticeState, expressions],
  );

  const state: ShadowAppState = shadowApp.ok
    ? shadowApp.value
    : { screens: [], dataFlows: [], errors: [{ nodeId: '__projection', message: shadowApp.error.message }], isValid: false };

  const errorNodeIds = new Set(state.errors.map((e) => e.nodeId));

  const incomingFlows = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const flow of state.dataFlows) {
      const existing = map.get(flow.to);
      if (existing !== undefined) {
        existing.push(flow.from.slice(0, 8));
      } else {
        map.set(flow.to, [flow.from.slice(0, 8)]);
      }
    }
    return map;
  }, [state.dataFlows]);

  return (
    <div
      style={{
        width: '320px',
        minWidth: '280px',
        height: '100vh',
        backgroundColor: '#0c0c14',
        borderLeft: '1px solid #1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #1a1a2e',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: state.isValid ? '#4aff9f' : '#ff4444',
          }}
        />
        <span style={{ color: '#e0e0e0', fontSize: '13px', fontFamily: 'monospace', fontWeight: 'bold' }}>
          Shadow Preview
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {state.screens.length === 0 ? (
          <EmptyState />
        ) : (
          state.screens.map((screen) => (
            <ScreenCard
              key={screen.id}
              screen={screen}
              hasError={errorNodeIds.has(screen.id)}
              connectedFrom={incomingFlows.get(screen.id) ?? []}
            />
          ))
        )}
      </div>

      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid #1a1a2e',
          fontSize: '10px',
          color: state.isValid ? '#4aff9f' : '#ff4444',
          fontFamily: 'monospace',
        }}
      >
        {state.isValid
          ? `${state.screens.length} screen(s) · ${state.dataFlows.length} flow(s)`
          : `${state.errors.length} error(s) blocking preview`}
      </div>
    </div>
  );
}
