'use client';

import { useCallback } from 'react';
import type { IDETreeNode, TreeSelection } from './types';

interface TreeNodeProps {
  node: IDETreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (selection: TreeSelection) => void;
  onToggle: (id: string) => void;
}

function TreeNodeComponent({
  node,
  depth,
  selectedId,
  onSelect,
  onToggle,
}: TreeNodeProps): React.ReactElement {
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  const indent = depth * 16;

  const handleClick = useCallback((): void => {
    if (node.type === 'page') {
      onSelect({ type: 'page', pageId: node.id });
    } else if (node.type === 'component') {
      onSelect({ type: 'component', pageId: node.id, componentId: node.id });
    } else if (node.type === 'node') {
      const parentId = node.id;
      onSelect({ type: 'node', pageId: parentId, componentId: parentId, nodeId: node.id });
    }
  }, [node, onSelect]);

  const handleToggle = useCallback((e: React.MouseEvent): void => {
    e.stopPropagation();
    onToggle(node.id);
  }, [node.id, onToggle]);

  const getIcon = (): string => {
    if (node.type === 'page') return '📄';
    if (node.type === 'component') {
      if (node.kind === 'ui') return '🎨';
      if (node.kind === 'logic') return '⚡';
      if (node.kind === 'layout') return '📐';
      return '📦';
    }
    return '●';
  };

  const getColor = (): string => {
    if (node.type === 'page') return '#4a9eff';
    if (node.type === 'component') {
      if (node.kind === 'ui') return '#22c55e';
      if (node.kind === 'logic') return '#f59e0b';
      if (node.kind === 'layout') return '#9f4aff';
      return '#888888';
    }
    return '#666666';
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          paddingLeft: `${indent + 8}px`,
          cursor: 'pointer',
          backgroundColor: isSelected ? '#1a2a3a' : 'transparent',
          borderRadius: '3px',
          fontSize: '11px',
          color: isSelected ? '#00ffff' : '#aaaaaa',
        }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <span
            style={{
              width: '14px',
              marginRight: '4px',
              fontSize: '10px',
              color: '#666',
            }}
            onClick={handleToggle}
          >
            {node.isExpanded ? '▼' : '▶'}
          </span>
        ) : (
          <span style={{ width: '14px', marginRight: '4px' }} />
        )}
        <span style={{ marginRight: '6px', fontSize: '12px' }}>{getIcon()}</span>
        <span style={{ color: getColor() }}>{node.name}</span>
      </div>
      {node.isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface ComponentTreePanelProps {
  tree: readonly IDETreeNode[];
  selectedId: string | null;
  onSelect: (selection: TreeSelection) => void;
  onToggleExpand: (id: string) => void;
  onAddPage: () => void;
  onAddComponent: (pageId: string) => void;
  onAddNode: (pageId: string, componentId: string) => void;
  onDelete: (id: string, type: 'page' | 'component' | 'node') => void;
  onRename: (id: string, newName: string) => void;
}

export function ComponentTreePanel({
  tree,
  selectedId,
  onSelect,
  onToggleExpand,
  onAddPage,
  onAddComponent,
  onAddNode,
  onDelete,
  onRename,
}: ComponentTreePanelProps): React.ReactElement {
  void onAddNode;
  void onDelete;
  void onRename;
  void selectedId;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0c0c14',
        borderRight: '1px solid #1a1a2e',
        fontSize: '11px',
        color: '#aaaaaa',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #1a1a2e',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#888888' }}>
          COMPONENTS
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            style={{
              background: 'transparent',
              border: '1px solid #333',
              color: '#888',
              padding: '2px 6px',
              fontSize: '10px',
              cursor: 'pointer',
              borderRadius: '3px',
            }}
            onClick={onAddPage}
            title="Add Page"
          >
            +📄
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {tree.length === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: '#444',
              fontSize: '10px',
            }}
          >
            No pages yet
            <br />
            <button
              style={{
                marginTop: '8px',
                background: 'transparent',
                border: '1px solid #333',
                color: '#666',
                padding: '4px 8px',
                fontSize: '10px',
                cursor: 'pointer',
                borderRadius: '3px',
              }}
              onClick={onAddPage}
            >
              Add Page
            </button>
          </div>
        ) : (
          tree.map((node) => (
            <TreeNodeComponent
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggle={onToggleExpand}
            />
          ))
        )}
      </div>

      {selectedId && (
        <div
          style={{
            padding: '8px',
            borderTop: '1px solid #1a1a2e',
            display: 'flex',
            gap: '4px',
            flexWrap: 'wrap',
          }}
        >
          {tree.find((p) => p.children.some((c) => c.id === selectedId)) && (
            <button
              style={{
                background: 'transparent',
                border: '1px solid #333',
                color: '#666',
                padding: '2px 6px',
                fontSize: '9px',
                cursor: 'pointer',
                borderRadius: '3px',
              }}
              onClick={(): void => {
                const page = tree.find((p) => p.children.some((c) => c.id === selectedId));
                if (page) onAddComponent(page.id);
              }}
            >
              +Component
            </button>
          )}
          <button
            style={{
              background: 'transparent',
              border: '1px solid #333',
              color: '#666',
              padding: '2px 6px',
              fontSize: '9px',
              cursor: 'pointer',
              borderRadius: '3px',
            }}
            onClick={(): void => onDelete(selectedId, 'component')}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}