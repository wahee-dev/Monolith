'use client';

import React, { useMemo } from 'react';
import type { LatticeState, LatticeNode } from '@lattice/types';
import type { GraphExecutionResult } from '@engine/types';

interface LiveAppProps {
  readonly state: LatticeState;
  readonly executionResult: GraphExecutionResult | null;
  readonly onEvent: (nodeId: string, eventName: string, data: unknown) => void;
}

export function LiveApp({ state, executionResult, onEvent }: LiveAppProps): React.ReactElement {
  const activeScene = state.scenes.get(state.activeSceneId)!;
  const outputs = executionResult?.outputs || new Map<string, unknown>();

  const uiNodes = useMemo(() => {
    return Array.from(activeScene.nodes.values()).filter(n => n.schema.output['element'] !== undefined);
  }, [activeScene]);

  const getChildren = (nodeId: string): LatticeNode[] => {
    const childIds = activeScene.connections
      .filter(c => c.to === nodeId && c.toPort === 'children')
      .map(c => c.from);
    return uiNodes.filter(n => childIds.includes(n.id));
  };

  const renderNode = (node: LatticeNode): React.ReactNode => {
    const outputValue = outputs.get(node.id as string) as any;
    const props = outputValue || {};

    const kind = node.kind as string;
    switch (kind) {
      case 'text':
        return (
          <span key={node.id} style={{ color: props.color, fontSize: props.fontSize }}>
            {props.text || 'Text'}
          </span>
        );
      case 'button':
        return (
          <button
            key={node.id}
            onClick={() => onEvent(node.id as string, 'onClick', {})}
            style={{
              padding: '8px 16px',
              backgroundColor: props.backgroundColor || '#478cbf',
              color: props.color || '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {props.label || 'Button'}
          </button>
        );
      case 'input':
        return (
          <input
            key={node.id}
            type="text"
            placeholder={props.placeholder || 'Type here...'}
            value={props.value || ''}
            onChange={(e) => onEvent(node.id as string, 'onChange', { value: e.target.value })}
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              color: '#000'
            }}
          />
        );
      case 'container':
      case 'flex':
        return (
          <div
            key={node.id}
            style={{
              display: kind === 'flex' ? 'flex' : 'block',
              flexDirection: props.direction || 'column',
              gap: props.gap || '12px',
              padding: props.padding || '12px',
              backgroundColor: props.backgroundColor || '#f9f9f9',
              border: props.border || '1px dashed #ddd',
              borderRadius: '4px',
              minHeight: '40px'
            }}
          >
            <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '4px' }}>{String(kind).toUpperCase()}</div>
            {getChildren(node.id as string).map(renderNode)}
          </div>
        );
      case 'image':
        return (
          <img
            key={node.id}
            src={props.src || 'https://via.placeholder.com/150'}
            alt={props.alt || ''}
            style={{ width: props.width, height: props.height, borderRadius: props.borderRadius }}
          />
        );
      default:
        return null;
    }
  };

  const rootNodes = useMemo(() => {
    const childIds = new Set(activeScene.connections
      .filter(c => c.toPort === 'children')
      .map(c => c.from as string));
    return uiNodes.filter(n => !childIds.has(n.id as string));
  }, [uiNodes, activeScene.connections]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#fff',
      color: '#333',
      padding: '20px',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '16px' }}>{activeScene.name}</h2>
        <span style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase' }}>Live Preview</span>
      </div>
      {rootNodes.map(renderNode)}
      {uiNodes.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', flexDirection: 'column' }}>
          <span style={{ fontSize: '48px' }}>🖼️</span>
          <p>Add UI nodes to see them here</p>
        </div>
      )}
    </div>
  );
}
