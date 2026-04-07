'use client';

import { useCallback, useMemo, useState } from 'react';
import { createLatticeNodeId } from '@lattice/types';
import type { LatticeState, LatticeNode, LatticeNodeId, LatticeNodeKind } from '@lattice/types';
import type { Point } from '@mesh/types';
import { MeshCanvas, useMeshProjection } from '@mesh/index';
import { useTypeCheckGuard } from '@mesh/hooks/useTypeCheckGuard';
import type { TypeCheckDiagnostic } from '@law/typecheck';

const ALL_KINDS: ReadonlyArray<LatticeNodeKind> = ['source', 'transform', 'sink', 'gate', 'merge', 'split'];

type ExecutionStatus = 'idle' | 'running' | 'blocked' | 'stopped';

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

const STATUS_BAR_COLORS: Record<ExecutionStatus, string> = {
  idle: '#555555',
  running: '#22c55e',
  blocked: '#ef4444',
  stopped: '#f59e0b',
};

const STATUS_BAR_LABELS: Record<ExecutionStatus, string> = {
  idle: 'IDLE',
  running: 'RUNNING',
  blocked: 'BLOCKED',
  stopped: 'STOPPED',
};

export default function MeshPage(): React.ReactElement {
  const [state] = useState(() => createSampleLatticeState());
  const view = useMeshProjection(state);

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
  const [expressions, setExpressions] = useState<Map<string, string>>(new Map());
  const [nodeTypeStatus, setNodeTypeStatus] = useState<Map<string, 'unchecked' | 'valid' | 'invalid'>>(new Map());
  const [nodeTypeErrors, setNodeTypeErrors] = useState<Map<string, string>>(new Map());
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const typeCheckGuard = useTypeCheckGuard();

  const applyDiagnostics = useCallback(
    (diagnostics: ReadonlyMap<string, TypeCheckDiagnostic>): void => {
      const newStatus = new Map<string, 'unchecked' | 'valid' | 'invalid'>();
      const newErrors = new Map<string, string>();

      for (const [nodeId, diag] of diagnostics) {
        if (diag.source.trim().length === 0) {
          newStatus.set(nodeId, 'unchecked');
        } else if (diag.isValid) {
          newStatus.set(nodeId, 'valid');
        } else {
          newStatus.set(nodeId, 'invalid');
          newErrors.set(nodeId, diag.error);
        }
      }

      setNodeTypeStatus(newStatus);
      setNodeTypeErrors(newErrors);
    },
    [],
  );

  const enhancedView = useMemo(() => {
    const nodes = view.nodes.map((node) => ({
      ...node,
      expression: expressions.get(node.id) ?? '',
      typeStatus: nodeTypeStatus.get(node.id) ?? 'unchecked' as const,
      typeError: nodeTypeErrors.get(node.id) ?? '',
    }));
    return { ...view, nodes };
  }, [view, expressions, nodeTypeStatus, nodeTypeErrors]);

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

  const handleRun = useCallback((): void => {
    typeCheckGuard.runTypeCheck(expressions);
    applyDiagnostics(typeCheckGuard.diagnostics);

    if (!typeCheckGuard.canExecute) {
      setExecutionStatus('blocked');
      setErrorMessage('Execution blocked: type check errors detected');
      return;
    }

    setExecutionStatus('running');
    setErrorMessage('');
  }, [expressions, typeCheckGuard, applyDiagnostics]);

  const handleStop = useCallback((): void => {
    setExecutionStatus('stopped');
    setErrorMessage('');
    typeCheckGuard.clearBlock();
  }, [typeCheckGuard]);

  const handleDismissError = useCallback((): void => {
    setErrorMessage('');
  }, []);

  const statusBarColor = STATUS_BAR_COLORS[executionStatus];
  const statusBarLabel = STATUS_BAR_LABELS[executionStatus];

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
        <span style={{ color: '#555555' }}>|</span>
        {executionStatus === 'running' ? (
          <span
            style={{
              cursor: 'pointer',
              color: '#f59e0b',
              fontWeight: 'bold',
              padding: '2px 10px',
              border: '1px solid #f59e0b',
              borderRadius: '3px',
            }}
            onClick={handleStop}
          >
            ■ STOP
          </span>
        ) : (
          <span
            style={{
              cursor: 'pointer',
              color: executionStatus === 'blocked' ? '#ef4444' : '#22c55e',
              fontWeight: 'bold',
              padding: '2px 10px',
              border: `1px solid ${executionStatus === 'blocked' ? '#ef4444' : '#22c55e'}`,
              borderRadius: '3px',
            }}
            onClick={handleRun}
          >
            ▶ RUN
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: '#555555' }}>
          {enhancedView.nodes.length} nodes · {enhancedView.edges.length} edges
        </span>
      </div>
      {errorMessage.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          backgroundColor: '#1a0a0a',
          borderBottom: '1px solid #3a1515',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#ef4444',
          flexShrink: 0,
        }}>
          <span>⚠</span>
          <span style={{ flex: 1 }}>{errorMessage}</span>
          <span
            style={{ cursor: 'pointer', color: '#888888' }}
            onClick={handleDismissError}
          >
            ✕
          </span>
        </div>
      )}
      <div style={{ flex: 1, position: 'relative' }}>
        <MeshCanvas
          view={enhancedView}
          selectedNodeId={selectedNodeId}
          editingNodeId={editingNodeId}
          nodePositions={nodePositions}
          isBlocking={typeCheckGuard.isBlocking}
          onNodeMove={handleNodeMove}
          onNodeSelect={handleNodeSelect}
          onNodeDoubleClick={handleNodeDoubleClick}
        />
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 16px',
        backgroundColor: '#0c0c14',
        borderTop: '1px solid #1a1a2e',
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#888888',
        flexShrink: 0,
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: statusBarColor,
          boxShadow: executionStatus === 'running'
            ? '0 0 6px #22c55e'
            : executionStatus === 'blocked'
              ? '0 0 6px #ef4444'
              : 'none',
        }} />
        <span style={{ color: statusBarColor, fontWeight: 'bold' }}>{statusBarLabel}</span>
        <span style={{ color: '#555555' }}>|</span>
        <span>{expressions.size} expressions</span>
        {typeCheckGuard.isBlocking && (
          <>
            <span style={{ color: '#555555' }}>|</span>
            <span style={{ color: '#ef4444' }}>
              {typeCheckGuard.diagnostics.size} checked · {Array.from(typeCheckGuard.diagnostics.values()).filter((d) => !d.isValid).length} errors
            </span>
          </>
        )}
      </div>
    </div>
  );
}
