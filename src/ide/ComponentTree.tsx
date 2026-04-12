'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import type { IDETreeNode, TreeSelection } from './types';

interface TreeNodeProps {
  node: IDETreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (selection: TreeSelection) => void;
  onToggle: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, node: IDETreeNode) => void;
  onRename: (id: string, newName: string) => void;
  onDragStart: (e: React.DragEvent, node: IDETreeNode) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetNode: IDETreeNode) => void;
  draggedNode: IDETreeNode | null;
  expandedNodes: Set<string>;
}

function getNodeIcon(node: IDETreeNode): string {
  if (node.type === 'page') return '📄';
  if (node.type === 'component') {
    if (node.kind === 'ui') return '□';
    if (node.kind === 'logic') return '⚡';
    if (node.kind === 'layout') return '▦';
    if (node.kind === 'forEach') return '⟳';
    if (node.kind === 'getState') return '◉';
    if (node.kind === 'setState') return '◎';
    return '📦';
  }
  const nodeKind = node.kind as string;
  if (nodeKind === 'text') return 'T';
  if (nodeKind === 'button') return '▢';
  if (nodeKind === 'input') return '◻';
  if (nodeKind === 'container') return '▣';
  if (nodeKind === 'image') return '▤';
  if (nodeKind === 'flex') return '▧';
  if (nodeKind === 'if') return '◇';
  if (nodeKind === 'forEach') return '⟳';
  if (nodeKind === 'variable') return '◈';
  if (nodeKind === 'function') return 'ƒ';
  if (nodeKind === 'array') return '[]';
  if (nodeKind === 'getState') return '◉';
  if (nodeKind === 'setState') return '◎';
  if (nodeKind === 'onEvent') return '⚡';
  if (nodeKind === 'subscribe') return '⊚';
  if (nodeKind === 'navigate') return '→';
  return '●';
}

function getNodeColor(node: IDETreeNode): string {
  if (node.type === 'page') return '#4a9eff';
  if (node.type === 'component') {
    if (node.kind === 'ui') return '#22c55e';
    if (node.kind === 'logic') return '#f59e0b';
    if (node.kind === 'layout') return '#9f4aff';
    return '#888888';
  }
  return '#666666';
}

function TreeNodeComponent({
  node,
  depth,
  selectedId,
  onSelect,
  onToggle,
  onContextMenu,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
  draggedNode,
  expandedNodes,
}: TreeNodeProps): React.ReactElement {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const indent = depth * 16;
  const rowHeight = 32;

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

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

  const handleDoubleClick = useCallback((): void => {
    setIsRenaming(true);
    setRenameValue(node.name);
  }, [node.name]);

  const handleRenameSubmit = useCallback((): void => {
    if (renameValue.trim() && renameValue !== node.name) {
      onRename(node.id, renameValue.trim());
    }
    setIsRenaming(false);
  }, [node.id, renameValue, node.name, onRename]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenameValue(node.name);
    }
  }, [handleRenameSubmit, node.name]);

  const handleDragStart = useCallback((e: React.DragEvent): void => {
    onDragStart(e, node);
  }, [node, onDragStart]);

  const handleDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    onDragOver(e);
  }, [onDragOver]);

  const handleDrop = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    onDrop(e, node);
  }, [node, onDrop]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: rowHeight,
          paddingLeft: `${indent + 8}px`,
          cursor: 'pointer',
          backgroundColor: isSelected ? 'rgba(74, 158, 255, 0.2)' : 'transparent',
          borderRadius: '3px',
          fontSize: '11px',
          color: isSelected ? '#4a9eff' : '#aaaaaa',
          transition: 'background-color 0.15s',
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e): void => onContextMenu(e, node)}
        draggable={node.type !== 'page'}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {hasChildren ? (
          <span
            style={{
              width: '14px',
              marginRight: '4px',
              fontSize: '10px',
              color: '#666',
              cursor: 'pointer',
            }}
            onClick={handleToggle}
          >
            {isExpanded ? '▼' : '▶'}
          </span>
        ) : (
          <span style={{ width: '14px', marginRight: '4px' }} />
        )}
        <span style={{ marginRight: '6px', fontSize: '12px', color: getNodeColor(node) }}>
          {getNodeIcon(node)}
        </span>
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e): void => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            style={{
              background: '#1a1a2e',
              border: '1px solid #4a9eff',
              color: '#e0e0e0',
              fontSize: '11px',
              padding: '2px 4px',
              outline: 'none',
              width: '100px',
            }}
          />
        ) : (
          <span style={{ color: getNodeColor(node) }}>{node.name}</span>
        )}
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
              onRename={onRename}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              draggedNode={draggedNode}
              expandedNodes={expandedNodes}
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
  onReorder: (nodeId: string, newParentId: string, index: number) => void;
  expandedNodes?: Set<string>;
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
  onReorder,
  expandedNodes = new Set(),
}: ComponentTreePanelProps): React.ReactElement {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: IDETreeNode } | null>(null);
  const [draggedNode, setDraggedNode] = useState<IDETreeNode | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: IDETreeNode): void => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDragStart = useCallback((_e: React.DragEvent, node: IDETreeNode): void => {
    setDraggedNode(node);
  }, []);

  const handleDragOver = useCallback((_e: React.DragEvent): void => {
  }, []);

  const handleDrop = useCallback((_e: React.DragEvent, targetNode: IDETreeNode): void => {
    if (draggedNode && draggedNode.id !== targetNode.id) {
      onReorder(draggedNode.id, targetNode.id, 0);
    }
    setDraggedNode(null);
  }, [draggedNode, onReorder]);

  const getContextMenuActions = (node: IDETreeNode): { label: string; action: () => void }[] => {
    const actions: { label: string; action: () => void }[] = [];

    if (node.type === 'page') {
      actions.push({ label: 'Add Component', action: () => onAddComponent(node.id) });
    } else if (node.type === 'component') {
      actions.push({ label: 'Add Node', action: () => onAddNode(node.id, node.id) });
    }

    if (node.type !== 'page') {
      actions.push({ label: 'Rename', action: () => onRename(node.id, node.name) });
      actions.push({
        label: 'Delete',
        action: () => onDelete(node.id, node.type),
      });
    }

    return actions;
  };

  if (isCollapsed) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#252833',
          borderRight: '1px solid #1d1f27',
          width: '40px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            borderBottom: '1px solid #1d1f27',
          }}
        >
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            onClick={(): void => setIsCollapsed(false)}
            title="Expand"
          >
            ⏵
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#252833',
        borderRight: '1px solid #1d1f27',
        fontSize: '13px',
        color: '#e0e0e0',
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: '#2b2e3b',
          borderBottom: '1px solid #1d1f27',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: '#478cbf' }}>🌲</span>
          <span style={{ fontWeight: '600', fontSize: '12px', color: '#e0e0e0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Scene
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '2px 4px',
            }}
            onClick={(): void => setIsCollapsed(true)}
            title="Collapse"
          >
            ⟲
          </button>
          <button
            style={{
              background: 'transparent',
              border: '1px solid #444',
              color: '#e0e0e0',
              padding: '2px 8px',
              fontSize: '12px',
              cursor: 'pointer',
              borderRadius: '3px',
            }}
            onClick={onAddPage}
            title="Add Page"
          >
            +
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
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
              onContextMenu={handleContextMenu}
              onRename={onRename}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              draggedNode={draggedNode}
              expandedNodes={expandedNodes}
            />
          ))
        )}
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: '#252525',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '4px 0',
            minWidth: '120px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {getContextMenuActions(contextMenu.node).map((action, index) => (
            <div
              key={index}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '11px',
                color: '#e0e0e0',
              }}
              onClick={(): void => {
                action.action();
                setContextMenu(null);
              }}
              onMouseEnter={(e): void => {
                (e.target as HTMLDivElement).style.backgroundColor = '#333333';
              }}
              onMouseLeave={(e): void => {
                (e.target as HTMLDivElement).style.backgroundColor = 'transparent';
              }}
            >
              {action.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}