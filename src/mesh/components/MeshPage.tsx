'use client';

import { useCallback, useState } from 'react';
import { createLatticeNodeId } from '@lattice/types';
import type { LatticeState, LatticeNode, LatticeNodeId, LatticeNodeKind } from '@lattice/types';
import type { Point } from '@mesh/types';
import { parseAndTypeCheck } from '@lattice/expression';
import { MeshCanvas, useMeshProjection } from '@mesh/index';

const ALL_KINDS: ReadonlyArray<LatticeNodeKind> = ['source', 'transform', 'sink', 'gate', 'merge', 'split'];

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

  const values = new Map([
    [sourceId, { data: 'hello-world', result: 'HELLO-WORLD' }],
    [transformId, { input: 'HELLO-WORLD', factor: 2, output: 'transformed' }],
    [sinkId, { value: 'transformed', confirmed: true }],
    [gateId, { payload: { key: 'value' }, active: true, items: [1, 2, 3] }],
  ]);

  return {
    nodes,
    connections,
    values,
    status: 'idle',
    version: 1,
  };
}

function extractInitialPositions(state: LatticeState): Map<string, Point> {
  const positions = new Map<string, Point>();
  const nodeList = Array.from(state.nodes.values());
  let xOffset = 80;
  let yOffset = 60;
  const yOffsetStart = 60;
  const layerGapX = 300;
  const maxColumnHeight = 500;

  for (let i = 0; i < nodeList.length; i++) {
    const node = nodeList[i]!;
    const inputCount = Object.keys(node.schema.input).length;
    const outputCount = Object.keys(node.schema.output).length;
    const height = 60 + (inputCount + outputCount) * 24;

    positions.set(node.id as string, { x: xOffset, y: yOffset });
    yOffset += height + 40;

    if (yOffset > maxColumnHeight) {
      yOffset = yOffsetStart;
      xOffset += layerGapX;
      yOffset = 60;
      xOffset += layerGapX;
    }
  }

  return positions;
}

export default function MeshPage(): React.ReactElement {
  const [state] = useState(() => createSampleLatticeState());
  const [expressions, setExpressions] = useState<Map<string, string>>(new Map());
  const [nodeTypeStatus, setNodeTypeStatus] = useState<Map<string, 'unchecked' | 'valid' | 'invalid'>>(new Map());
  const [nodeTypeErrors, setNodeTypeErrors] = useState<Map<string, string>>(new Map());

  const view = useMeshProjection(state, expressions, nodeTypeStatus, nodeTypeErrors);

  const [nodePositions, setNodePositions] = useState<Map<string, Point>>(
    () => {
      const positions = extractInitialPositions(state);
      for (const node of view.nodes) {
        if (!positions.has(node.id)) {
          positions.set(node.id, { x: node.rect.x, y: node.rect.y });
        }
      }
      return positions;
    },
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const handleNodeMove = useCallback(
    (nodeId: string, newPosition: Point): void => {
      setNodePositions((prev) => {
        const next = new Map(prev);
        next.set(nodeId, newPosition);
        return next;
      });
    },
    [],
  );

  const handleNodeSelect = useCallback((nodeId: string | null): void => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleNodeDoubleClick = useCallback((nodeId: string): void => {
    setEditingNodeId(nodeId);
  }, []);

  const handleAddNode = useCallback(
    (kind: LatticeNodeKind): void => {
      const id = createLatticeNodeId(`node-${kind}-${Date.now()}`);
      const newNode: LatticeNode = {
        id,
        kind,
        schema: {
          input: { data: { name: 'data', type: 'string', required: true } },
          output: { result: { name: 'result', type: 'string', required: true } },
        },
      };

      const lastPos = Array.from(nodePositions.values()).pop();
      const x = (lastPos?.x ?? 80) + 250;
      const y = lastPos?.y ?? 60;

      setNodePositions((prev) => {
        const next = new Map(prev);
        next.set(id as string, { x, y });
        return next;
      });

      void state;
      void newNode;
    },
    [nodePositions, state],
  );

  const handleDeleteNode = useCallback((): void => {
    if (selectedNodeId === null) return;
    setNodePositions((prev) => {
      const next = new Map(prev);
      next.delete(selectedNodeId);
      return next;
    });
    setExpressions((prev) => {
      const next = new Map(prev);
      next.delete(selectedNodeId);
      return next;
    });
    setNodeTypeStatus((prev) => {
      const next = new Map(prev);
      next.delete(selectedNodeId);
      return next;
    });
    setNodeTypeErrors((prev) => {
      const next = new Map(prev);
      next.delete(selectedNodeId);
      return next;
    });
    setSelectedNodeId(null);
    setEditingNodeId(null);
  }, [selectedNodeId]);

  const handleExpressionCommit = useCallback(
    (nodeId: string, expression: string): void => {
      setExpressions((prev) => {
        const next = new Map(prev);
        next.set(nodeId, expression);
        return next;
      });

      if (expression.trim().length === 0) {
        setNodeTypeStatus((prev) => {
          const next = new Map(prev);
          next.set(nodeId, 'unchecked');
          return next;
        });
        setNodeTypeErrors((prev) => {
          const next = new Map(prev);
          next.delete(nodeId);
          return next;
        });
      } else {
        const result = parseAndTypeCheck(expression);
        if (result.ok) {
          setNodeTypeStatus((prev) => {
            const next = new Map(prev);
            next.set(nodeId, 'valid');
            return next;
          });
          setNodeTypeErrors((prev) => {
            const next = new Map(prev);
            next.delete(nodeId);
            return next;
          });
        } else {
          setNodeTypeStatus((prev) => {
            const next = new Map(prev);
            next.set(nodeId, 'invalid');
            return next;
          });
          setNodeTypeErrors((prev) => {
            const next = new Map(prev);
            next.set(nodeId, result.error.message);
            return next;
          });
        }
      }

      setEditingNodeId(null);
    },
    [],
  );

  const handleExpressionCancel = useCallback((): void => {
    setEditingNodeId(null);
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#08080f',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 16px',
        backgroundColor: '#0c0c14',
        borderBottom: '1px solid #1a1a2e',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#888888',
        zIndex: 10,
        flexShrink: 0,
      }}>
        <span style={{ color: '#4a9eff', fontWeight: 'bold' }}>MONOLITH</span>
        <span style={{ color: '#555555' }}>|</span>
        <span>MESH</span>
        <span style={{ color: '#555555' }}>|</span>
        <div style={{ position: 'relative' }}>
          <span style={{ cursor: 'pointer', color: '#aaaaaa' }}>+ Add Node ▾</span>
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            display: 'none',
            backgroundColor: '#14141f',
            border: '1px solid #2a2a3e',
            borderRadius: '4px',
            padding: '4px 0',
            zIndex: 100,
          }}>
            {ALL_KINDS.map((kind) => (
              <div
                key={kind}
                style={{
                  padding: '4px 12px',
                  cursor: 'pointer',
                  color: '#cccccc',
                }}
                onClick={() => handleAddNode(kind)}
              >
                {kind}
              </div>
            ))}
          </div>
        </div>
        {selectedNodeId !== null && (
          <span
            style={{ cursor: 'pointer', color: '#ef4444' }}
            onClick={handleDeleteNode}
          >
            ✕ Delete
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: '#555555' }}>
          {view.nodes.length} nodes · {view.edges.length} edges
        </span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <MeshCanvas
          view={view}
          selectedNodeId={selectedNodeId}
          editingNodeId={editingNodeId}
          nodePositions={nodePositions}
          onNodeMove={handleNodeMove}
          onNodeSelect={handleNodeSelect}
          onNodeDoubleClick={handleNodeDoubleClick}
          onExpressionCommit={handleExpressionCommit}
          onExpressionCancel={handleExpressionCancel}
        />
      </div>
    </div>
  );
}
