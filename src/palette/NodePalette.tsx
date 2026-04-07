'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { NodeCategory, NodeTypeDefinition } from '@engine/types';
import { NODE_REGISTRY, searchNodes } from '@engine/registry';
import { NodeCard } from './NodeCard';
import type { PaletteState } from './types';

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  data: '#4a9eff',
  logic: '#ff9f4a',
  transform: '#9f4aff',
  io: '#4aff9f',
  flow: '#9fff4a',
  ui: '#ff4a9f',
};

const ALL_TABS: ReadonlyArray<NodeCategory | 'all'> = [
  'all',
  'data',
  'logic',
  'transform',
  'io',
  'flow',
];

interface NodePaletteProps {
  readonly paletteState: PaletteState;
  readonly onToggle: () => void;
  readonly onSearchChange: (query: string) => void;
  readonly onCategoryChange: (category: NodeCategory | 'all') => void;
  readonly onAddNode: (kind: string) => void;
}

function getCategoryCounts(): ReadonlyMap<NodeCategory | 'all', number> {
  const counts = new Map<NodeCategory | 'all', number>();
  let total = 0;
  for (const def of NODE_REGISTRY.values()) {
    total += 1;
    const current = counts.get(def.category);
    counts.set(def.category, current === undefined ? 1 : current + 1);
  }
  counts.set('all', total);
  return counts;
}

function getRecentDefinitions(
  recentKinds: ReadonlyArray<string>,
): ReadonlyArray<NodeTypeDefinition> {
  const result: NodeTypeDefinition[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < recentKinds.length; i++) {
    const kind = recentKinds[i]!;
    if (seen.has(kind)) continue;
    seen.add(kind);
    const def = NODE_REGISTRY.get(kind);
    if (def !== undefined) {
      result.push(def);
    }
  }
  return result;
}

export function NodePalette({
  paletteState,
  onToggle,
  onSearchChange,
  onCategoryChange,
  onAddNode,
}: NodePaletteProps): React.ReactElement {
  const { isOpen, searchQuery, selectedCategory, recentNodes } = paletteState;

  const [localQuery, setLocalQuery] = useState<string>(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const categoryCounts = useMemo(() => getCategoryCounts(), []);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalQuery(value);
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSearchChange(value);
      }, 200);
    },
    [onSearchChange],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const filteredNodes = useMemo((): ReadonlyArray<NodeTypeDefinition> => {
    const searched = searchQuery.length > 0
      ? searchNodes(searchQuery)
      : Array.from(NODE_REGISTRY.values());

    if (selectedCategory === 'all') {
      return searched;
    }
    return searched.filter((def) => def.category === selectedCategory);
  }, [searchQuery, selectedCategory]);

  const recentDefinitions = useMemo(
    () => (searchQuery.length === 0 ? getRecentDefinitions(recentNodes) : []),
    [searchQuery, recentNodes],
  );

  const tabCounts = useMemo((): ReadonlyMap<string, number> => {
    if (searchQuery.length === 0) {
      return categoryCounts;
    }
    const counts = new Map<string, number>();
    const searched = searchNodes(searchQuery);
    let total = 0;
    for (let i = 0; i < searched.length; i++) {
      const def = searched[i]!;
      total += 1;
      const current = counts.get(def.category);
      counts.set(def.category, current === undefined ? 1 : current + 1);
    }
    counts.set('all', total);
    return counts;
  }, [searchQuery, categoryCounts]);

  if (!isOpen) {
    return (
      <div
        style={{
          width: '32px',
          height: '100%',
          backgroundColor: '#0c0c14',
          borderRight: '1px solid #2a2a3e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '6px',
          flexShrink: 0,
          fontFamily: 'monospace',
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          style={{
            backgroundColor: 'transparent',
            color: '#888888',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '2px',
            fontFamily: 'monospace',
          }}
          title="Open palette"
        >
          &#9776;
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '260px',
        height: '100%',
        backgroundColor: '#0c0c14',
        borderRight: '1px solid #2a2a3e',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 8px',
          borderBottom: '1px solid #2a2a3e',
          backgroundColor: '#14141f',
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          style={{
            backgroundColor: 'transparent',
            color: '#888888',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            padding: '0',
            fontFamily: 'monospace',
            lineHeight: 1,
          }}
          title="Close palette"
        >
          &#9776;
        </button>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            value={localQuery}
            onChange={handleInputChange}
            placeholder="Search nodes..."
            style={{
              width: '100%',
              height: '32px',
              backgroundColor: '#1a1a2e',
              color: '#e0e0e0',
              border: '1px solid #2a2a3e',
              borderRadius: '3px',
              padding: '0 8px 0 22px',
              fontFamily: 'monospace',
              fontSize: '11px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '7px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666',
              fontSize: '10px',
              pointerEvents: 'none',
            }}
          >
            &#128269;
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          borderBottom: '1px solid #2a2a3e',
          backgroundColor: '#14141f',
          padding: '2px 4px',
          gap: '1px',
          flexShrink: 0,
        }}
      >
        {ALL_TABS.map((tab) => {
          const isActive = selectedCategory === tab;
          const tabColor = tab === 'all' ? '#e0e0e0' : CATEGORY_COLORS[tab];
          const count = tabCounts.get(tab) ?? 0;
          const isHovered = hoveredTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={(): void => onCategoryChange(tab)}
              onMouseEnter={(): void => setHoveredTab(tab)}
              onMouseLeave={(): void => setHoveredTab(null)}
              style={{
                backgroundColor: isActive ? `${tabColor}22` : isHovered ? '#1a1a2e' : 'transparent',
                color: isActive ? tabColor : '#888888',
                border: 'none',
                borderBottom: isActive ? `2px solid ${tabColor}` : '2px solid transparent',
                borderRadius: '0',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '9px',
                fontFamily: 'monospace',
                textTransform: 'uppercase' as const,
                whiteSpace: 'nowrap' as const,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              {tab}
              <span
                style={{
                  backgroundColor: isActive ? `${tabColor}33` : '#2a2a3e',
                  color: isActive ? tabColor : '#888888',
                  padding: '0px 3px',
                  borderRadius: '6px',
                  fontSize: '8px',
                  fontFamily: 'monospace',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {recentDefinitions.length > 0 && (
          <div style={{ borderBottom: '1px solid #2a2a3e' }}>
            <div
              style={{
                padding: '4px 8px',
                color: '#666',
                fontSize: '9px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Recent
            </div>
            {recentDefinitions.map((def) => (
              <div key={`recent-${def.kind}`} style={{ marginBottom: '1px' }}>
                <NodeCard definition={def} onAddNode={onAddNode} />
              </div>
            ))}
          </div>
        )}

        {filteredNodes.length > 0 ? (
          <div>
            {recentDefinitions.length > 0 && (
              <div
                style={{
                  padding: '4px 8px',
                  color: '#666',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                All Nodes
              </div>
            )}
            {filteredNodes.map((def) => (
              <div key={def.kind} style={{ marginBottom: '1px' }}>
                <NodeCard definition={def} onAddNode={onAddNode} />
              </div>
            ))}
          </div>
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
              No nodes match your search
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
