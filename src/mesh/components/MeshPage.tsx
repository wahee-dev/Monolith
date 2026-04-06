'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LatticeState, LatticeNodeKind, LatticeNode, LatticeNodeId } from '@lattice/types';
import { createLatticeNodeId } from '@lattice/types';
import type { CanvasState, MeshViewV2 } from '../types';
import { MeshCanvas } from './MeshCanvas';
import { useTypeCheckStatus } from '../hooks/useTypeCheckStatus';
import { projectMeshV2 } from '../projector';

const TOOLBAR_HEIGHT = 40;

const KIND_OPTIONS: ReadonlyArray<LatticeNodeKind> = [
  'source',
  'transform',
  'sink',
  'gate',
  'merge',
  'split',
];

function createSampleLatticeState(): LatticeState {
  const sourceId = createLatticeNodeId('node-source-001');
  const transformId = createLatticeNodeId('node-transform-002');
  const sinkId = createLatticeNodeId('node-sink-003');
  const gateId = createLatticeNodeId('node-gate-004');

  const nodes = new Map<LatticeNodeId, LatticeNode>([
    [
      sourceId,
      {
        id: sourceId,
        kind: 'source',
        schema: {
          input: {
            data: { name: 'data', type: 'string', required: true },
          },
          output: {
            result: { name: 'result', type: 'string', required: true },
          },
        },
      },
    ],
    [
      transformId,
      {
        id: transformId,
        kind: 'transform',
        schema: {
          input: {
            input: { name: 'input', type: 'string', required: true },
            factor: { name: 'factor', type: 'number', required: true },
          },
          output: {
            output: { name: 'output', type: 'string', required: true },
          },
        },
      },
    ],
    [
      sinkId,
      {
        id: sinkId,
        kind: 'sink',
        schema: {
          input: {
            value: { name: 'value', type: 'string', required: true },
          },
          output: {
            confirmed: { name: 'confirmed', type: 'boolean', required: true },
          },
        },
      },
    ],
    [
      gateId,
      {
        id: gateId,
        kind: 'gate',
        schema: {
          input: {
            payload: { name: 'payload', type: 'object', required: true },
            active: { name: 'active', type: 'boolean', required: true },
          },
          output: {
            items: { name: 'items', type: 'array', required: true },
          },
        },
      },
    ],
  ]);

  const connections = [
    {
      id: 'conn-001',
      from: sourceId,
      to: transformId,
      fromPort: 'result',
      toPort: 'input',
    },
    {
      id: 'conn-002',
      from: transformId,
      to: sinkId,
      fromPort: 'output',
      toPort: 'value',
    },
    {
      id: 'conn-003',
      from: transformId,
      to: gateId,
      fromPort: 'output',
      toPort: 'payload',
    },
  ];

  return {
    nodes,
    connections,
    values: new Map(),
    status: 'idle',
    version: 1,
  };
}

export default function MeshPage(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [latticeState, setLatticeState] = useState<LatticeState>(() => createSampleLatticeState());
  const [expressions, setExpressions] = useState<ReadonlyMap<string, string>>(() => {
    const initial = new Map<string, string>();
    initial.set('node-source-001', '"hello"');
    initial.set('node-transform-002', 'input + " world"');
    return initial;
  });
  const [canvasState, setCanvasState] = useState<CanvasState>({
    offset: { x: 0, y: 0 },
    zoom: 1,
    selectedNodeId: null,
    editingNodeId: null,
  });
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const { diagnostics, checkExpression, checkAll } = useTypeCheckStatus();

  useEffect(() => {
    checkAll(expressions);
  }, [expressions, checkAll]);

  useEffect(() => {
    const el = containerRef.current;
    if (el === null) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry !== undefined) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const view: MeshViewV2 = useMemo(
    () => {
      const result = projectMeshV2(latticeState, expressions, diagnostics);
      if (result.ok) return result.value;
      return { nodes: [], edges: [], bounds: { x: 0, y: 0, width: 800, height: 600 } };
    },
    [latticeState, expressions, diagnostics],
  );

  const handleNodeSelect = useCallback((nodeId: string | null): void => {
    setCanvasState((prev) => ({ ...prev, selectedNodeId: nodeId }));
  }, []);

  const handleNodeDoubleClick = useCallback((nodeId: string): void => {
    setCanvasState((prev) => ({ ...prev, editingNodeId: nodeId }));
  }, []);

  const handleExpressionChange = useCallback(
    (nodeId: string, expression: string): void => {
      setExpressions((prev) => {
        const next = new Map(prev);
        next.set(nodeId, expression);
        return next;
      });
      checkExpression(nodeId, expression);
    },
    [checkExpression],
  );

  const handleExpressionCommit = useCallback(
    (nodeId: string, expression: string): void => {
      setExpressions((prev) => {
        const next = new Map(prev);
        next.set(nodeId, expression);
        return next;
      });
      checkExpression(nodeId, expression);
    },
    [checkExpression],
  );

  const handleAddNode = useCallback((kind: LatticeNodeKind): void => {
    const id = createLatticeNodeId(`node-${kind}-${Date.now()}`);
    const newNode: LatticeNode = {
      id,
      kind,
      schema: {
        input: { value: { name: 'value', type: 'string', required: true } },
        output: { result: { name: 'result', type: 'string', required: true } },
      },
    };
    setLatticeState((prev) => ({
      ...prev,
      nodes: new Map([...prev.nodes, [id, newNode]]),
      version: prev.version + 1,
    }));
    setAddMenuOpen(false);
  }, []);

  const handleDeleteNode = useCallback((): void => {
    if (canvasState.selectedNodeId === null) return;
    const nodeId = canvasState.selectedNodeId;
    setLatticeState((prev) => {
      const newNodes = new Map(prev.nodes);
      newNodes.delete(createLatticeNodeId(nodeId));
      const newConnections = prev.connections.filter(
        (c) => String(c.from) !== nodeId && String(c.to) !== nodeId,
      );
      return {
        ...prev,
        nodes: newNodes,
        connections: newConnections,
        version: prev.version + 1,
      };
    });
    setExpressions((prev) => {
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });
    setCanvasState((prev) => ({
      ...prev,
      selectedNodeId: null,
      editingNodeId: null,
    }));
  }, [canvasState.selectedNodeId]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#08080f', overflow: 'hidden' }}>
      <div style={{
        height: TOOLBAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
        backgroundColor: '#0c0c14',
        borderBottom: '1px solid #1a1a2e',
        fontFamily: 'monospace',
        fontSize: 13,
        color: '#888888',
        flexShrink: 0,
      }}>
        <span style={{ color: '#4a9eff', fontWeight: 'bold', fontSize: 14 }}>MONOLITH</span>
        <span style={{ color: '#333333' }}>|</span>
        <span>v{latticeState.version}</span>
        <span style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: latticeState.status === 'running' ? '#00ff88' : latticeState.status === 'error' ? '#ff4444' : '#666666',
        }} />
        <span>{latticeState.status}</span>
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <button
            onClick={() => setAddMenuOpen((prev) => !prev)}
            style={{
              backgroundColor: '#1a1a2e',
              color: '#4a9eff',
              border: '1px solid #2a2a3e',
              padding: '4px 12px',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'pointer',
              borderRadius: 3,
            }}
          >
            + Add Node
          </button>
          {addMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              backgroundColor: '#12121e',
              border: '1px solid #2a2a3e',
              borderRadius: 3,
              zIndex: 10,
              minWidth: 140,
            }}>
              {KIND_OPTIONS.map((kind) => (
                <button
                  key={kind}
                  onClick={() => handleAddNode(kind)}
                  style={{
                    display: 'block',
                    width: '100%',
                    backgroundColor: 'transparent',
                    color: '#e0e0e0',
                    border: 'none',
                    padding: '6px 12px',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1a1a2e'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {kind}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleDeleteNode}
          disabled={canvasState.selectedNodeId === null}
          style={{
            backgroundColor: canvasState.selectedNodeId !== null ? '#1a1a2e' : '#0c0c14',
            color: canvasState.selectedNodeId !== null ? '#ff4444' : '#333333',
            border: '1px solid #2a2a3e',
            padding: '4px 12px',
            fontFamily: 'monospace',
            fontSize: 12,
            cursor: canvasState.selectedNodeId !== null ? 'pointer' : 'default',
            borderRadius: 3,
          }}
        >
          Delete Node
        </button>
      </div>
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MeshCanvas
          view={view}
          canvasState={canvasState}
          onCanvasStateChange={setCanvasState}
          onNodeSelect={handleNodeSelect}
          onNodeDoubleClick={handleNodeDoubleClick}
          onExpressionChange={handleExpressionChange}
          onExpressionCommit={handleExpressionCommit}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
        />
      </div>
    </div>
  );
}
