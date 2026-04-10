'use client';

import { useCallback } from 'react';
import type { ConsoleEntry, ConsoleEntryType, ConsolePanelProps, ConsoleTab } from './types';

const COLORS: Record<ConsoleEntryType, string> = {
  success: '#4aff9f',
  error: '#ef4444',
  info: '#4a9eff',
  warning: '#f59e0b',
};

const TABS: ConsoleTab[] = ['output', 'errors', 'warnings', 'logs'];

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

function filterEntries(
  entries: ReadonlyArray<ConsoleEntry>,
  tab: ConsoleTab,
): ReadonlyArray<ConsoleEntry> {
  if (tab === 'output') {
    return entries;
  }
  if (tab === 'errors') {
    return entries.filter((e) => e.type === 'error');
  }
  if (tab === 'warnings') {
    return entries.filter((e) => e.type === 'warning');
  }
  return entries.filter((e) => e.type === 'info' || e.type === 'success');
}

function ConsoleEntryView({
  entry,
  onClick,
}: {
  readonly entry: ConsoleEntry;
  readonly onClick: (nodeId: string) => void;
}): React.ReactElement {
  const color = COLORS[entry.type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '4px 8px',
        borderBottom: '1px solid #1a1a2e',
        cursor: entry.nodeId ? 'pointer' : 'default',
        backgroundColor: entry.nodeId ? '#0a0a12' : 'transparent',
      }}
      onClick={(): void => {
        if (entry.nodeId) {
          onClick(entry.nodeId);
        }
      }}
      role={entry.nodeId ? 'button' : undefined}
      tabIndex={entry.nodeId ? 0 : undefined}
      onKeyDown={(e): void => {
        if ((e.key === 'Enter' || e.key === ' ') && entry.nodeId) {
          onClick(entry.nodeId);
        }
      }}
    >
      <span
        style={{
          color: '#444',
          fontSize: '9px',
          fontFamily: 'monospace',
          flexShrink: 0,
          width: '70px',
        }}
      >
        {formatTimestamp(entry.timestamp)}
      </span>
      <span
        style={{
          color: color,
          fontSize: '10px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          flexShrink: 0,
          width: '40px',
        }}
      >
        {entry.type}
      </span>
      <span
        style={{
          color: '#ccc',
          fontSize: '10px',
          fontFamily: 'monospace',
          flex: 1,
          wordBreak: 'break-word',
        }}
      >
        {entry.message}
      </span>
      {entry.nodeId && (
        <span
          style={{
            color: '#4a9eff',
            fontSize: '9px',
            fontFamily: 'monospace',
            flexShrink: 0,
          }}
        >
          {entry.nodeId}
        </span>
      )}
    </div>
  );
}

export function ConsolePanel({
  consoleState,
  onTabChange,
  onToggleCollapse,
  onClear,
  onEntryClick,
  onClose,
}: ConsolePanelProps): React.ReactElement {
  const filteredEntries = filterEntries(consoleState.entries, consoleState.activeTab);

  const handleTabClick = useCallback(
    (tab: ConsoleTab): void => {
      onTabChange(tab);
    },
    [onTabChange],
  );

  const handleCopy = useCallback((): void => {
    const text = filteredEntries
      .map((e) => `[${e.type.toUpperCase()}] ${e.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  }, [filteredEntries]);

  if (consoleState.isCollapsed) {
    return (
      <div
        style={{
          height: '28px',
          backgroundColor: '#0c0c14',
          borderTop: '1px solid #1a1a2e',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: '#666',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}
        >
          Console
        </span>
        <span style={{ marginLeft: '8px', color: '#444', fontSize: '10px' }}>
          {consoleState.entries.length} items
        </span>
        <button
          type="button"
          onClick={onToggleCollapse}
          style={{
            marginLeft: 'auto',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: '10px',
            padding: '2px 4px',
            fontFamily: 'monospace',
          }}
        >
          &#9650;
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        height: consoleState.height,
        backgroundColor: '#0c0c14',
        borderTop: '1px solid #1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          cursor: 'ns-resize',
          backgroundColor: 'transparent',
          zIndex: 10,
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '28px',
          padding: '0 8px',
          borderBottom: '1px solid #1a1a2e',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: '2px' }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={(): void => handleTabClick(tab)}
              style={{
                backgroundColor:
                  consoleState.activeTab === tab ? '#1a1a2e' : 'transparent',
                color: consoleState.activeTab === tab ? '#e0e0e0' : '#666',
                border: 'none',
                borderRadius: '3px',
                padding: '2px 8px',
                fontSize: '10px',
                fontFamily: 'monospace',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
              {tab === 'errors' &&
                consoleState.entries.filter((e) => e.type === 'error').length > 0 && (
                  <span style={{ marginLeft: '4px', color: '#ef4444' }}>
                    {
                      consoleState.entries.filter((e) => e.type === 'error').length
                    }
                  </span>
                )}
              {tab === 'warnings' &&
                consoleState.entries.filter((e) => e.type === 'warning').length > 0 && (
                  <span style={{ marginLeft: '4px', color: '#f59e0b' }}>
                    {
                      consoleState.entries.filter((e) => e.type === 'warning').length
                    }
                  </span>
                )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '2px 6px',
            fontFamily: 'monospace',
          }}
          title="Copy to clipboard"
        >
          &#128203;
        </button>
        <button
          type="button"
          onClick={onClear}
          style={{
            marginLeft: 'auto',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '2px 6px',
            fontFamily: 'monospace',
          }}
          title="Clear console"
        >
          &#128465;
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: '10px',
            padding: '2px 4px',
            fontFamily: 'monospace',
          }}
          title="Collapse console"
        >
          &#9660;
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: '10px',
            padding: '2px 4px',
            fontFamily: 'monospace',
          }}
          title="Close console"
        >
          x
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {filteredEntries.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#444',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
          >
            No output
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <ConsoleEntryView
              key={entry.id}
              entry={entry}
              onClick={onEntryClick}
            />
          ))
        )}
      </div>
    </div>
  );
}