'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import MeshPage from '@mesh/components/MeshPage';
import { NodePalette } from '@palette/index';
import type { PaletteState } from '@palette/types';
import { InspectorPanel } from '@inspector/index';
import type { InspectorState } from '@inspector/types';
import { ShadowAppPanel, projectShadowApp } from '@preview/index';
import type { LatticeState, LatticeNode, LatticeNodeId, LatticeNodeKind, LatticeConnection, NodeSchema, SchemaField } from '@lattice/types';
import { createLatticeNodeId } from '@lattice/types';
import { addNode, removeNode, addConnection, removeConnection } from '@lattice/actions';
import { parseAndTypeCheck } from '@lattice/expression';
import type { Point } from '@mesh/types';
import type { PortType, GraphValidation } from '@engine/types';
import { validateGraph } from '@engine/validator';
import { getNodeTypeDefinition } from '@engine/registry';
import {
  createHistory,
  pushHistory,
  undo as historyUndo,
  redo as historyRedo,
  canUndo as historyCanUndo,
  canRedo as historyCanRedo,
} from '@engine/history';
import type { HistoryState } from '@engine/history';
import {
  createExecutionState,
  startExecution,
  resetExecution,
} from '@engine/execution';
import type { ExecutionState } from '@engine/execution';
import { executeGraph } from '@engine/executor';
import type { GraphExecutionResult } from '@engine/types';
import { useTypeCheckGuard } from '@mesh/hooks/useTypeCheckGuard';
import type { TypeCheckDiagnostic } from '@law/typecheck';
import { useKeyboardShortcuts } from '@mesh/hooks/useKeyboardShortcuts';

const KIND_SCHEMAS: Record<LatticeNodeKind, NodeSchema> = {
  source: {
    input: {},
    output: { emit: { name: 'emit', type: 'string', required: true } },
  },
  transform: {
    input: { input: { name: 'input', type: 'string', required: true } },
    output: { output: { name: 'output', type: 'string', required: true } },
  },
  sink: {
    input: { receive: { name: 'receive', type: 'string', required: true } },
    output: {},
  },
  gate: {
    input: {
      condition: { name: 'condition', type: 'boolean', required: true },
      data: { name: 'data', type: 'string', required: true },
    },
    output: { passed: { name: 'passed', type: 'string', required: true } },
  },
  merge: {
    input: {
      a: { name: 'a', type: 'string', required: true },
      b: { name: 'b', type: 'string', required: true },
    },
    output: { merged: { name: 'merged', type: 'string', required: true } },
  },
  split: {
    input: { input: { name: 'input', type: 'string', required: true } },
    output: {
      left: { name: 'left', type: 'string', required: true },
      right: { name: 'right', type: 'string', required: true },
    },
  },
};

function getSchemaForKind(kind: LatticeNodeKind): NodeSchema {
  const regResult = getNodeTypeDefinition(kind);
  if (regResult.ok) {
    const def = regResult.value;
    const input: Record<string, SchemaField> = {};
    for (let i = 0; i < def.inputs.length; i++) {
      const port = def.inputs[i]!;
      const t = port.type;
      const fieldType: 'string' | 'number' | 'boolean' | 'object' | 'array' =
        (t === 'string' || t === 'number' || t === 'boolean' || t === 'object' || t === 'array') ? t : 'string';
      input[port.name] = { name: port.label, type: fieldType, required: true };
    }
    const output: Record<string, SchemaField> = {};
    for (let i = 0; i < def.outputs.length; i++) {
      const port = def.outputs[i]!;
      const t = port.type;
      const fieldType: 'string' | 'number' | 'boolean' | 'object' | 'array' =
        (t === 'string' || t === 'number' || t === 'boolean' || t === 'object' || t === 'array') ? t : 'string';
      output[port.name] = { name: port.label, type: fieldType, required: true };
    }
    return { input, output };
  }
  return KIND_SCHEMAS[kind];
}

function createSampleState(): {
  state: LatticeState;
  positions: Map<string, Point>;
  expressions: Map<string, string>;
} {
  const sourceId = createLatticeNodeId('source-1');
  const sinkId = createLatticeNodeId('sink-1');
  const sourceSchema = getSchemaForKind('source');
  const sinkSchema = getSchemaForKind('sink');

  const sourceNode: LatticeNode = { id: sourceId, kind: 'source', schema: sourceSchema };
  const sinkNode: LatticeNode = { id: sinkId, kind: 'sink', schema: sinkSchema };

  const connectionId = 'conn-sample-1';
  const sampleConn: LatticeConnection = {
    id: connectionId,
    from: sourceId,
    to: sinkId,
    fromPort: 'emit',
    toPort: 'receive',
  };

  const state: LatticeState = {
    nodes: new Map([
      [sourceId, sourceNode],
      [sinkId, sinkNode],
    ]),
    connections: [sampleConn],
    values: new Map(),
    status: 'idle',
    version: 1,
  };

  const positions = new Map<string, Point>();
  positions.set(sourceId as string, { x: 80, y: 120 });
  positions.set(sinkId as string, { x: 420, y: 120 });

  const expressions = new Map<string, string>();
  expressions.set(sourceId as string, '"Hello World"');

  return { state, positions, expressions };
}

type TypeStatusValue = 'unchecked' | 'valid' | 'invalid';

export default function Home(): React.ReactElement {
  const sampleData = useMemo(() => createSampleState(), []);
  const [latticeState, setLatticeState] = useState<LatticeState>(sampleData.state);
  const [expressions, setExpressions] = useState<Map<string, string>>(sampleData.expressions);
  const [nodePositions, setNodePositions] = useState<Map<string, Point>>(sampleData.positions);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [executionState, setExecutionState] = useState<ExecutionState>(createExecutionState());
  const [historyState, setHistoryState] = useState<HistoryState>(createHistory());
  const [paletteState, setPaletteState] = useState<PaletteState>({
    isOpen: true,
    searchQuery: '',
    selectedCategory: 'all',
    recentNodes: [],
  });
  const [typeStatus, setTypeStatus] = useState<Map<string, TypeStatusValue>>(new Map());
  const [typeErrors, setTypeErrors] = useState<Map<string, string>>(new Map());
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [executionResult, setExecutionResult] = useState<GraphExecutionResult | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const kindCounters = useRef<Map<string, number>>(new Map());
  const executionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const typeCheckGuard = useTypeCheckGuard();

  const graphValidation = useMemo((): GraphValidation | null => {
    if (latticeState.nodes.size === 0) return null;

    const nodeLikeMap = new Map<
      string,
      {
        readonly kind: string;
        readonly inputs: ReadonlyArray<{ readonly name: string; readonly type: PortType; readonly label: string; readonly required: boolean }>;
        readonly outputs: ReadonlyArray<{ readonly name: string; readonly type: PortType; readonly label: string; readonly required: boolean }>;
      }
    >();

    for (const [id, node] of latticeState.nodes) {
      const defResult = getNodeTypeDefinition(node.kind);
      if (defResult.ok) {
        nodeLikeMap.set(id as string, defResult.value);
      } else {
        nodeLikeMap.set(id as string, { kind: node.kind, inputs: [], outputs: [] });
      }
    }

    const connectionLike = latticeState.connections.map((conn) => ({
      id: conn.id,
      from: conn.from as string,
      to: conn.to as string,
      fromPort: conn.fromPort,
      toPort: conn.toPort,
    }));

    return validateGraph(nodeLikeMap, connectionLike);
  }, [latticeState.nodes, latticeState.connections]);

  const pushToHistory = useCallback(
    (label: string): void => {
      setHistoryState((prev) =>
        pushHistory(prev, {
          state: latticeState,
          expressions,
          nodePositions,
          label,
          timestamp: Date.now(),
        }),
      );
    },
    [latticeState, expressions, nodePositions],
  );

  const applyDiagnostics = useCallback(
    (diagnostics: ReadonlyMap<string, TypeCheckDiagnostic>): void => {
      const newStatus = new Map<string, TypeStatusValue>();
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

      setTypeStatus(newStatus);
      setTypeErrors(newErrors);
    },
    [],
  );

  const handleAddNode = useCallback(
    (kind: string): void => {
      pushToHistory('Add node');

      const latticeKind = kind as LatticeNodeKind;
      const currentCount = kindCounters.current.get(kind) ?? 0;
      const nextCount = currentCount + 1;
      kindCounters.current.set(kind, nextCount);
      const id = createLatticeNodeId(`${kind}-${nextCount}-${Date.now()}`);
      const schema = getSchemaForKind(latticeKind);
      const newNode: LatticeNode = { id, kind: latticeKind, schema };

      const x = 200 + Math.random() * 200;
      const y = 100 + Math.random() * 200;

      setNodePositions((prev) => {
        const next = new Map(prev);
        next.set(id as string, { x, y });
        return next;
      });

      setLatticeState((prev) => addNode(prev, newNode));

      setPaletteState((prev) => ({
        ...prev,
        recentNodes: [kind, ...prev.recentNodes.filter((k) => k !== kind)].slice(0, 5),
      }));
    },
    [pushToHistory],
  );

  const handleDeleteSelected = useCallback((): void => {
    if (selectedNodeId !== null) {
      pushToHistory('Delete node');
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
      setTypeStatus((prev) => {
        const next = new Map(prev);
        next.delete(selectedNodeId);
        return next;
      });
      setTypeErrors((prev) => {
        const next = new Map(prev);
        next.delete(selectedNodeId);
        return next;
      });
      setLatticeState((prev) => removeNode(prev, selectedNodeId as LatticeNodeId));
      setSelectedNodeId(null);
      setEditingNodeId(null);
    } else if (selectedEdgeId !== null) {
      pushToHistory('Delete connection');
      setLatticeState((prev) => removeConnection(prev, selectedEdgeId));
      setSelectedEdgeId(null);
    }
  }, [selectedNodeId, selectedEdgeId, pushToHistory]);

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
    if (nodeId !== null) {
      setSelectedEdgeId(null);
    }
  }, []);

  const handleNodeDoubleClick = useCallback((nodeId: string): void => {
    setEditingNodeId(nodeId);
  }, []);

  const handleEdgeSelect = useCallback((edgeId: string | null): void => {
    setSelectedEdgeId(edgeId);
    if (edgeId !== null) {
      setSelectedNodeId(null);
    }
  }, []);

  const handleConnectionCreate = useCallback(
    (fromNodeId: string, fromPort: string, toNodeId: string, toPort: string): void => {
      pushToHistory('Create connection');
      const connId = `conn-${Date.now()}`;
      const newConn: LatticeConnection = {
        id: connId,
        from: createLatticeNodeId(fromNodeId),
        to: createLatticeNodeId(toNodeId),
        fromPort,
        toPort,
      };
      setLatticeState((prev) => addConnection(prev, newConn));
      setErrorMessage('');
    },
    [pushToHistory],
  );

  const handleConnectionValidationError = useCallback(
    (fromType: PortType, toType: PortType): void => {
      setErrorMessage(`Type mismatch: cannot connect ${fromType} output to ${toType} input`);
    },
    [],
  );

  const handleExpressionCommit = useCallback(
    (nodeId: string, expression: string): void => {
      pushToHistory('Edit expression');
      setExpressions((prev) => {
        const next = new Map(prev);
        next.set(nodeId, expression);
        return next;
      });

      if (expression.trim().length === 0) {
        setTypeStatus((prev) => {
          const next = new Map(prev);
          next.set(nodeId, 'unchecked');
          return next;
        });
        setTypeErrors((prev) => {
          const next = new Map(prev);
          next.delete(nodeId);
          return next;
        });
      } else {
        const result = parseAndTypeCheck(expression);
        if (result.ok) {
          setTypeStatus((prev) => {
            const next = new Map(prev);
            next.set(nodeId, 'valid');
            return next;
          });
          setTypeErrors((prev) => {
            const next = new Map(prev);
            next.delete(nodeId);
            return next;
          });
        } else {
          setTypeStatus((prev) => {
            const next = new Map(prev);
            next.set(nodeId, 'invalid');
            return next;
          });
          setTypeErrors((prev) => {
            const next = new Map(prev);
            next.set(nodeId, result.error.message);
            return next;
          });
        }
      }

      setEditingNodeId(null);
    },
    [pushToHistory],
  );

  const handleExpressionCancel = useCallback((): void => {
    setEditingNodeId(null);
  }, []);

  const handleDeselect = useCallback((): void => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setEditingNodeId(null);
  }, []);

  const handleUndo = useCallback((): void => {
    const result = historyUndo(historyState);
    if (result.ok) {
      setHistoryState(result.value.history);
      setLatticeState(result.value.entry.state);
      setExpressions(new Map(result.value.entry.expressions));
      setNodePositions(new Map(result.value.entry.nodePositions));
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setEditingNodeId(null);
    }
  }, [historyState]);

  const handleRedo = useCallback((): void => {
    const result = historyRedo(historyState);
    if (result.ok) {
      setHistoryState(result.value.history);
      setLatticeState(result.value.entry.state);
      setExpressions(new Map(result.value.entry.expressions));
      setNodePositions(new Map(result.value.entry.nodePositions));
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setEditingNodeId(null);
    }
  }, [historyState]);

  const handleRun = useCallback((): void => {
    const { diagnostics: runDiagnostics, canExecute } = typeCheckGuard.runTypeCheck(expressions);
    applyDiagnostics(runDiagnostics);

    if (!canExecute) {
      setErrorMessage('Execution blocked: type check errors detected');
      return;
    }

    if (graphValidation !== null && !graphValidation.isValid) {
      const errorMessages = graphValidation.errors.map((e) => e.message).join('; ');
      setErrorMessage(`Graph validation failed: ${errorMessages}`);
      return;
    }

    setErrorMessage('');

    const startResult = startExecution(latticeState);
    if (!startResult.ok) {
      setErrorMessage(startResult.error.message);
      return;
    }

    setExecutionState(startResult.value);

    const execResult = executeGraph(latticeState, expressions);
    if (execResult.ok) {
      setExecutionResult(execResult.value);
      const newState = { ...latticeState };
      const newValues = new Map(newState.values);
      for (const [nodeId, value] of execResult.value.outputs) {
        newValues.set(nodeId as LatticeNodeId, value);
      }
      setLatticeState({ ...newState, values: newValues, version: newState.version + 1 });
    } else {
      setErrorMessage(execResult.error.message);
      setExecutionResult(null);
    }
  }, [expressions, typeCheckGuard, applyDiagnostics, graphValidation, latticeState]);

  const handleStop = useCallback((): void => {
    if (executionTimerRef.current !== null) {
      clearInterval(executionTimerRef.current);
      executionTimerRef.current = null;
    }
    setExecutionState(resetExecution(executionState));
    typeCheckGuard.clearBlock();
  }, [executionState, typeCheckGuard]);

  const handleTogglePalette = useCallback((): void => {
    setPaletteState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const handlePaletteSearchChange = useCallback((query: string): void => {
    setPaletteState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const handlePaletteCategoryChange = useCallback((category: 'all' | 'data' | 'logic' | 'transform' | 'io' | 'ui' | 'flow'): void => {
    setPaletteState((prev) => ({ ...prev, selectedCategory: category }));
  }, []);

  const handleInspectorExpressionChange = useCallback((_expression: string): void => {
    // live typing feedback - no-op until commit
  }, []);

  const handleInspectorExpressionCommit = useCallback(
    (expression: string): void => {
      if (selectedNodeId === null) return;
      handleExpressionCommit(selectedNodeId, expression);
    },
    [selectedNodeId, handleExpressionCommit],
  );

  const handleInspectorSchemaChange = useCallback(
    (_schema: NodeSchema): void => {
      // schema changes are handled through lattice actions
    },
    [],
  );

  const handleInspectorClose = useCallback((): void => {
    setSelectedNodeId(null);
  }, []);

  useKeyboardShortcuts(
    {
      onUndo: handleUndo,
      onRedo: handleRedo,
      onDelete: handleDeleteSelected,
      onDeselect: handleDeselect,
      onTogglePalette: handleTogglePalette,
      onRun: handleRun,
      onStop: handleStop,
    },
    true,
  );

  const inspectorState = useMemo((): InspectorState => {
    if (selectedNodeId === null) {
      return {
        selectedNodeId: null,
        nodeDefinition: null,
        expression: '',
        executionOutput: undefined,
        executionError: '',
        lastExecutionTime: 0,
        portValues: new Map(),
        validationErrors: [],
      };
    }

    const node = latticeState.nodes.get(selectedNodeId as LatticeNodeId);
    const defResult = node !== undefined ? getNodeTypeDefinition(node.kind) : null;
    const nodeDef = defResult !== null && defResult.ok ? defResult.value : null;
    const expr = expressions.get(selectedNodeId) ?? '';
    const typeErr = typeErrors.get(selectedNodeId);

    let execOutput: unknown = undefined;
    let execError = '';
    let execTime = 0;
    if (executionResult !== null) {
      const output = executionResult.outputs.get(selectedNodeId);
      if (output !== undefined) {
        execOutput = output;
        execTime = executionResult.durationMs;
      }
      if (!executionResult.success && executionResult.error !== undefined) {
        execError = executionResult.error;
      }
    }

    const portValues = new Map<string, unknown>();
    if (node !== undefined) {
      const nodeVal = latticeState.values.get(node.id);
      if (nodeVal !== undefined) {
        if (typeof nodeVal === 'object' && nodeVal !== null && !Array.isArray(nodeVal)) {
          const record = nodeVal as Record<string, unknown>;
          for (const key of Object.keys(record)) {
            portValues.set(key, record[key]);
          }
        }
      }
    }

    const validationErrs: string[] = [];
    if (typeErr !== undefined) {
      validationErrs.push(typeErr);
    }
    if (graphValidation !== null) {
      for (let i = 0; i < graphValidation.errors.length; i++) {
        const err = graphValidation.errors[i]!;
        if (err.nodeId === selectedNodeId) {
          validationErrs.push(err.message);
        }
      }
    }

    return {
      selectedNodeId,
      nodeDefinition: nodeDef,
      expression: expr,
      executionOutput: execOutput,
      executionError: execError,
      lastExecutionTime: execTime,
      portValues,
      validationErrors: validationErrs,
    };
  }, [selectedNodeId, latticeState, expressions, typeErrors, executionResult, graphValidation]);

  const shadowState = useMemo(() => {
    const result = projectShadowApp(latticeState, typeErrors);
    if (result.ok) return result.value;
    return {
      screens: [],
      flows: [],
      errors: [{ nodeId: 'system', message: result.error.message }],
      valid: false,
      version: 0,
    };
  }, [latticeState, typeErrors]);

  const errorCount = graphValidation?.errors.length ?? 0;
  const warningCount = graphValidation?.warnings.length ?? 0;
  const statusLabel = executionState.mode === 'running' ? 'RUNNING'
    : executionState.mode === 'paused' ? 'PAUSED'
    : executionState.mode === 'stepping' ? 'STEPPING'
    : 'IDLE';
  const statusColor = executionState.mode === 'running' ? '#22c55e'
    : executionState.mode === 'paused' ? '#f59e0b'
    : executionState.mode === 'stepping' ? '#00ffff'
    : '#555555';

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#08080f',
      overflow: 'hidden',
      fontFamily: 'monospace',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 16px',
        backgroundColor: '#0c0c14',
        borderBottom: '1px solid #1a1a2e',
        fontSize: '12px',
        color: '#888888',
        zIndex: 10,
        flexShrink: 0,
      }}>
        <span
          style={{ cursor: 'pointer', color: paletteState.isOpen ? '#00ffff' : '#aaaaaa', fontSize: '16px' }}
          onClick={handleTogglePalette}
          title="Toggle Palette (Space)"
        >
          &#9776;
        </span>
        <span style={{ color: '#555555' }}>|</span>
        <span style={{ color: '#4a9eff', fontWeight: 'bold', letterSpacing: '2px' }}>MONOLITH ENGINE</span>
        <span style={{ color: '#555555' }}>|</span>
        {executionState.mode === 'running' || executionState.mode === 'stepping' ? (
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
            title="Stop (Ctrl+.)"
          >
            &#9632; STOP
          </span>
        ) : (
          <span
            style={{
              cursor: 'pointer',
              color: errorCount > 0 ? '#ef4444' : '#22c55e',
              fontWeight: 'bold',
              padding: '2px 10px',
              border: `1px solid ${errorCount > 0 ? '#ef4444' : '#22c55e'}`,
              borderRadius: '3px',
            }}
            onClick={handleRun}
            title="Run (Ctrl+Enter)"
          >
            &#9654; RUN
          </span>
        )}
        <span
          style={{
            cursor: historyCanUndo(historyState) ? 'pointer' : 'default',
            color: historyCanUndo(historyState) ? '#aaaaaa' : '#444444',
          }}
          onClick={handleUndo}
          title="Undo (Ctrl+Z)"
        >
          &#8630; Undo
        </span>
        <span
          style={{
            cursor: historyCanRedo(historyState) ? 'pointer' : 'default',
            color: historyCanRedo(historyState) ? '#aaaaaa' : '#444444',
          }}
          onClick={handleRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          &#8631; Redo
        </span>
        <span style={{ color: '#555555' }}>|</span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            boxShadow: executionState.mode === 'running' ? '0 0 6px #22c55e' : 'none',
          }} />
          <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '10px' }}>{statusLabel}</span>
        </div>
        <span style={{ color: '#555555' }}>
          {latticeState.nodes.size} nodes
        </span>
        {executionResult !== null && (
          <span style={{ color: '#888888', fontSize: '10px' }}>
            {executionResult.durationMs}ms
          </span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            cursor: 'pointer',
            color: showPreview ? '#00ffff' : '#888888',
            fontSize: '10px',
            padding: '2px 8px',
            border: `1px solid ${showPreview ? '#00ffff' : '#2a2a3e'}`,
            borderRadius: '3px',
          }}
          onClick={(): void => setShowPreview(!showPreview)}
        >
          PREVIEW
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
          fontSize: '11px',
          color: '#ef4444',
          flexShrink: 0,
        }}>
          <span>&#9888;</span>
          <span style={{ flex: 1 }}>{errorMessage}</span>
          <span
            style={{ cursor: 'pointer', color: '#888888' }}
            onClick={(): void => setErrorMessage('')}
          >
            &#10005;
          </span>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <NodePalette
          paletteState={paletteState}
          onToggle={handleTogglePalette}
          onSearchChange={handlePaletteSearchChange}
          onCategoryChange={handlePaletteCategoryChange}
          onAddNode={handleAddNode}
        />

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MeshPage
            latticeState={latticeState}
            expressions={expressions}
            nodePositions={nodePositions}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            editingNodeId={editingNodeId}
            executionState={executionState}
            executionResult={executionResult}
            typeStatus={typeStatus}
            typeErrors={typeErrors}
            graphValidation={graphValidation}
            isBlocking={typeCheckGuard.isBlocking}
            errorMessage={errorMessage}
            onNodeMove={handleNodeMove}
            onNodeSelect={handleNodeSelect}
            onNodeDoubleClick={handleNodeDoubleClick}
            onExpressionCommit={handleExpressionCommit}
            onExpressionCancel={handleExpressionCancel}
            onConnectionCreate={handleConnectionCreate}
            onConnectionValidationError={handleConnectionValidationError}
            onEdgeSelect={handleEdgeSelect}
            onDeleteSelected={handleDeleteSelected}
            onDeselect={handleDeselect}
          />
        </div>

        {showPreview && (
          <ShadowAppPanel
            state={shadowState}
            executionResult={executionResult}
          />
        )}

        <InspectorPanel
          inspectorState={inspectorState}
          onExpressionChange={handleInspectorExpressionChange}
          onExpressionCommit={handleInspectorExpressionCommit}
          onSchemaChange={handleInspectorSchemaChange}
          onClose={handleInspectorClose}
        />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 16px',
        backgroundColor: '#0c0c14',
        borderTop: '1px solid #1a1a2e',
        fontSize: '10px',
        color: '#888888',
        flexShrink: 0,
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          boxShadow: executionState.mode === 'running' ? '0 0 6px #22c55e' : 'none',
        }} />
        <span style={{ color: statusColor, fontWeight: 'bold' }}>{statusLabel}</span>
        <span style={{ color: '#555555' }}>|</span>
        <span>{latticeState.nodes.size} nodes &middot; {latticeState.connections.length} edges</span>
        {errorCount > 0 && (
          <>
            <span style={{ color: '#555555' }}>|</span>
            <span style={{ color: '#ef4444', cursor: 'pointer' }}>
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          </>
        )}
        {warningCount > 0 && (
          <>
            <span style={{ color: '#555555' }}>|</span>
            <span style={{ color: '#f59e0b' }}>
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
          </>
        )}
        {errorCount === 0 && warningCount === 0 && (
          <>
            <span style={{ color: '#555555' }}>|</span>
            <span style={{ color: '#22c55e' }}>&#10003; no errors</span>
          </>
        )}
        {executionResult !== null && (
          <>
            <span style={{ color: '#555555' }}>|</span>
            <span style={{ color: '#00ffff' }}>
              trace: {executionResult.trace.length} steps
            </span>
          </>
        )}
        <span style={{ marginLeft: 'auto', color: '#555555' }}>
          {expressions.size} expressions &middot; v{latticeState.version}
        </span>
      </div>
    </div>
  );
}
