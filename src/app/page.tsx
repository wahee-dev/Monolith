'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { TemplateDropdown } from '@templates/TemplateDropdown';
import type { Template } from '@templates/index';
import { getTemplateById } from '@templates/index';
import { getMonolithAPI } from '@engine/monolith-api';
import { IDELayout } from '@ide/index';
import type { IDEPanelState } from '@ide/index';
import { ConsolePanel } from '@console/index';
import type { ConsoleState, ConsoleTab, ConsoleEntry } from '@console/types';

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
  const [idePanelState, setIdePanelState] = useState<IDEPanelState>({
    isOpen: false,
    leftWidth: 220,
    rightWidth: 280,
    showCodeEditor: false,
  });
  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(false);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(false);
  const [showBottomPanel, setShowBottomPanel] = useState<boolean>(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [consoleState, setConsoleState] = useState<ConsoleState>({
    isOpen: true,
    isCollapsed: false,
    activeTab: 'output',
    height: 150,
    entries: [],
  });

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

  const loadTemplate = useCallback(
    (template: Template): void => {
      pushToHistory('Load template: ' + template.name);

      const nodeIdMap: string[] = [];
      const newNodes = new Map<LatticeNodeId, LatticeNode>();
      const newPositions = new Map<string, Point>();
      const newExpressions = new Map<string, string>();

      for (let i = 0; i < template.nodes.length; i++) {
        const tnode = template.nodes[i]!;
        const id = createLatticeNodeId(`${tnode.kind}-${i + 1}-${Date.now()}`);
        nodeIdMap.push(id as string);
        const schema = getSchemaForKind(tnode.kind);
        const node: LatticeNode = { id, kind: tnode.kind, schema };
        newNodes.set(id, node);
        newPositions.set(id as string, tnode.position);
        if (tnode.expression !== undefined) {
          newExpressions.set(id as string, tnode.expression);
        }
      }

      const newConnections: LatticeConnection[] = [];
      for (let i = 0; i < template.connections.length; i++) {
        const tc = template.connections[i]!;
        const connId = `conn-${i + 1}-${Date.now()}`;
        newConnections.push({
          id: connId,
          from: createLatticeNodeId(nodeIdMap[tc.fromNodeIndex]!),
          to: createLatticeNodeId(nodeIdMap[tc.toNodeIndex]!),
          fromPort: tc.fromPort,
          toPort: tc.toPort,
        });
      }

      const newState: LatticeState = {
        nodes: newNodes,
        connections: newConnections,
        values: new Map(),
        status: 'idle',
        version: 1,
      };

      setLatticeState(newState);
      setNodePositions(newPositions);
      setExpressions(newExpressions);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setEditingNodeId(null);
    },
    [pushToHistory],
  );

  const initialTemplateLoaded = useRef(false);

  useEffect(() => {
    if (initialTemplateLoaded.current) return;
    initialTemplateLoaded.current = true;
    if (latticeState.nodes.size === 0) {
      const starter = getTemplateById('getting-started');
      if (starter !== undefined) loadTemplate(starter);
    }
  }, [latticeState.nodes.size, loadTemplate]);

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
      } else if (expression.includes('import [') || expression.includes('Monolith.')) {
        // Hybrid JS - skip type checking
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

  const addConsoleEntry = useCallback(
    (type: ConsoleEntry['type'], message: string, nodeId?: string, details?: string): void => {
      const entry: ConsoleEntry = {
        id: `console-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        message,
        timestamp: Date.now(),
        ...(nodeId !== undefined && { nodeId }),
        ...(details !== undefined && { details }),
      };
      setConsoleState((prev) => ({
        ...prev,
        entries: [...prev.entries, entry],
      }));
    },
    [],
  );

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
      for (const err of graphValidation.errors) {
        addConsoleEntry('error', err.message, err.nodeId);
      }
      for (const warn of graphValidation.warnings) {
        addConsoleEntry('warning', warn.message, warn.nodeId);
      }
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
      addConsoleEntry('success', `Execution completed in ${execResult.value.durationMs}ms`);
      const newState = { ...latticeState };
      const newValues = new Map(newState.values);
      for (const [nodeId, value] of execResult.value.outputs) {
        newValues.set(nodeId as LatticeNodeId, value);
      }
      setLatticeState({ ...newState, values: newValues, version: newState.version + 1 });
      for (const traceItem of execResult.value.trace) {
        addConsoleEntry('info', `${traceItem.nodeId}: executed`, traceItem.nodeId);
      }
    } else {
      setErrorMessage(execResult.error.message);
      addConsoleEntry('error', execResult.error.message);
      setExecutionResult(null);
    }
  }, [expressions, typeCheckGuard, applyDiagnostics, graphValidation, latticeState, addConsoleEntry]);

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

  const handleToggleLeftPanel = useCallback((): void => {
    setShowLeftPanel((prev) => !prev);
  }, []);

  const handleToggleRightPanel = useCallback((): void => {
    setShowRightPanel((prev) => !prev);
  }, []);

  const handleToggleBottomPanel = useCallback((): void => {
    setShowBottomPanel((prev) => !prev);
  }, []);

  const handleMenuClick = useCallback((menu: string): void => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  }, []);

  const handleMenuAction = useCallback((action: string): void => {
    setActiveMenu(null);
    switch (action) {
      case 'new':
        pushToHistory('New project');
        setLatticeState({ nodes: new Map(), connections: [], values: new Map(), status: 'idle', version: 1 });
        setNodePositions(new Map());
        setExpressions(new Map());
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        break;
      case 'save':
        getMonolithAPI().notify('Project saved!', 'success');
        break;
      case 'undo':
        handleUndo();
        break;
      case 'redo':
        handleRedo();
        break;
      case 'run':
        handleRun();
        break;
      case 'stop':
        handleStop();
        break;
      case 'toggleLeft':
        handleToggleLeftPanel();
        break;
      case 'toggleRight':
        handleToggleRightPanel();
        break;
      case 'toggleBottom':
        handleToggleBottomPanel();
        break;
      case 'togglePreview':
        setShowPreview((prev) => !prev);
        break;
      case 'toggleIDE':
        setIdePanelState((prev) => ({
          ...prev,
          isOpen: !prev.isOpen,
          showCodeEditor: !prev.isOpen ? true : prev.showCodeEditor,
        }));
        break;
    }
  }, [pushToHistory, handleUndo, handleRedo, handleRun, handleStop, handleToggleLeftPanel, handleToggleRightPanel, handleToggleBottomPanel]);

  const handlePaletteSearchChange = useCallback((query: string): void => {
    setPaletteState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const handlePaletteCategoryChange = useCallback((category: 'all' | 'data' | 'logic' | 'transform' | 'io' | 'ui' | 'flow' | 'state'): void => {
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

  const handleConsoleTabChange = useCallback((tab: ConsoleTab): void => {
    setConsoleState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const handleConsoleToggleCollapse = useCallback((): void => {
    setConsoleState((prev) => ({ ...prev, isCollapsed: !prev.isCollapsed }));
  }, []);

  const handleConsoleClear = useCallback((): void => {
    setConsoleState((prev) => ({ ...prev, entries: [] }));
  }, []);

  const handleConsoleEntryClick = useCallback((nodeId: string): void => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleConsoleClose = useCallback((): void => {
    setConsoleState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleNameComponent = useCallback(
    (name: string): void => {
      if (selectedNodeId === null) return;
      const Monolith = getMonolithAPI();

      const selectedNode = latticeState.nodes.get(selectedNodeId as LatticeNodeId);
      if (!selectedNode) return;

      const subgraphNodes = new Map<LatticeNodeId, LatticeNode>();
      const subgraphConnections: LatticeConnection[] = [];
      const positions = new Map<string, Point>();

      subgraphNodes.set(selectedNodeId as LatticeNodeId, selectedNode);
      positions.set(selectedNodeId as string, nodePositions.get(selectedNodeId) ?? { x: 0, y: 0 });

      for (let i = 0; i < latticeState.connections.length; i++) {
        const conn = latticeState.connections[i]!;
        const fromId = conn.from as string;
        const toId = conn.to as string;

        if (fromId === selectedNodeId || toId === selectedNodeId) {
          subgraphConnections.push(conn);

          if (fromId !== selectedNodeId) {
            const fromNode = latticeState.nodes.get(conn.from);
            if (fromNode && !subgraphNodes.has(conn.from)) {
              subgraphNodes.set(conn.from, fromNode);
              positions.set(fromId, nodePositions.get(fromId) ?? { x: 0, y: 0 });
            }
          }

          if (toId !== selectedNodeId) {
            const toNode = latticeState.nodes.get(conn.to);
            if (toNode && !subgraphNodes.has(conn.to)) {
              subgraphNodes.set(conn.to, toNode);
              positions.set(toId, nodePositions.get(toId) ?? { x: 0, y: 0 });
            }
          }
        }
      }

      Monolith.registerComponent(name, {
        nodes: subgraphNodes as Map<string, unknown>,
        connections: subgraphConnections,
        positions: positions as Map<string, { x: number; y: number }>,
      });

      Monolith.notify(`Component "${name}" registered!`, 'success');
    },
    [selectedNodeId, latticeState, nodePositions],
  );

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
      backgroundColor: '#1a1a1a',
      overflow: 'hidden',
      fontFamily: 'monospace',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: '32px',
        padding: '0 8px',
        backgroundColor: '#252525',
        borderBottom: '1px solid #333333',
        fontSize: '12px',
        color: '#e0e0e0',
        zIndex: 10,
        flexShrink: 0,
      }}>
        <div style={{ position: 'relative' }}>
          <span
            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '3px', backgroundColor: activeMenu === 'file' ? '#3a3a3a' : 'transparent' }}
            onClick={(): void => handleMenuClick('file')}
          >
            File
          </span>
          {activeMenu === 'file' && (
            <div style={{ position: 'absolute', top: '100%', left: 0, backgroundColor: '#252525', border: '1px solid #333333', borderRadius: '4px', padding: '4px 0', minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '6px 16px', cursor: 'pointer', color: '#e0e0e0' }} onClick={(): void => handleMenuAction('new')}>New Project</div>
              <div style={{ padding: '6px 16px', cursor: 'pointer', color: '#e0e0e0' }} onClick={(): void => handleMenuAction('save')}>Save</div>
              <div style={{ height: '1px', backgroundColor: '#333333', margin: '4px 0' }} />
              <div style={{ padding: '6px 16px', cursor: 'pointer', color: '#888888' }}>Export</div>
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <span
            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '3px', backgroundColor: activeMenu === 'edit' ? '#3a3a3a' : 'transparent' }}
            onClick={(): void => handleMenuClick('edit')}
          >
            Edit
          </span>
          {activeMenu === 'edit' && (
            <div style={{ position: 'absolute', top: '100%', left: 0, backgroundColor: '#252525', border: '1px solid #333333', borderRadius: '4px', padding: '4px 0', minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '6px 16px', cursor: 'pointer', color: historyCanUndo(historyState) ? '#e0e0e0' : '#555555' }} onClick={(): void => handleMenuAction('undo')}>Undo</div>
              <div style={{ padding: '6px 16px', cursor: 'pointer', color: historyCanRedo(historyState) ? '#e0e0e0' : '#555555' }} onClick={(): void => handleMenuAction('redo')}>Redo</div>
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <span
            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '3px', backgroundColor: activeMenu === 'view' ? '#3a3a3a' : 'transparent' }}
            onClick={(): void => handleMenuClick('view')}
          >
            View
          </span>
          {activeMenu === 'view' && (
            <div style={{ position: 'absolute', top: '100%', left: 0, backgroundColor: '#252525', border: '1px solid #333333', borderRadius: '4px', padding: '4px 0', minWidth: '180px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '6px 16px', cursor: 'pointer', color: showLeftPanel ? '#4a9eff' : '#e0e0e0' }} onClick={(): void => handleMenuAction('toggleLeft')}>Left Panel {showLeftPanel ? '✓' : ''}</div>
              <div style={{ padding: '6px 16px', cursor: 'pointer', color: showRightPanel ? '#4a9eff' : '#e0e0e0' }} onClick={(): void => handleMenuAction('toggleRight')}>Right Panel {showRightPanel ? '✓' : ''}</div>
              <div style={{ padding: '6px 16px', cursor: 'pointer', color: showBottomPanel ? '#4a9eff' : '#e0e0e0' }} onClick={(): void => handleMenuAction('toggleBottom')}>Bottom Panel {showBottomPanel ? '✓' : ''}</div>
              <div style={{ height: '1px', backgroundColor: '#333333', margin: '4px 0' }} />
              <div style={{ padding: '6px 16px', cursor: 'pointer', color: showPreview ? '#4a9eff' : '#e0e0e0' }} onClick={(): void => handleMenuAction('togglePreview')}>Preview {showPreview ? '✓' : ''}</div>
              <div style={{ padding: '6px 16px', cursor: 'pointer', color: idePanelState.isOpen ? '#4a9eff' : '#e0e0e0' }} onClick={(): void => handleMenuAction('toggleIDE')}>Code Editor {idePanelState.isOpen ? '✓' : ''}</div>
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <span
            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '3px', backgroundColor: activeMenu === 'run' ? '#3a3a3a' : 'transparent' }}
            onClick={(): void => handleMenuClick('run')}
          >
            Run
          </span>
          {activeMenu === 'run' && (
            <div style={{ position: 'absolute', top: '100%', left: 0, backgroundColor: '#252525', border: '1px solid #333333', borderRadius: '4px', padding: '4px 0', minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              {executionState.mode === 'running' || executionState.mode === 'stepping' ? (
                <div style={{ padding: '6px 16px', cursor: 'pointer', color: '#f59e0b' }} onClick={(): void => handleMenuAction('stop')}>■ Stop</div>
              ) : (
                <div style={{ padding: '6px 16px', cursor: 'pointer', color: errorCount > 0 ? '#ef4444' : '#4aff9f' }} onClick={(): void => handleMenuAction('run')}>▶ Run</div>
              )}
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <span
            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '3px', backgroundColor: activeMenu === 'help' ? '#3a3a3a' : 'transparent' }}
            onClick={(): void => handleMenuClick('help')}
          >
            Help
          </span>
          {activeMenu === 'help' && (
            <div style={{ position: 'absolute', top: '100%', left: 0, backgroundColor: '#252525', border: '1px solid #333333', borderRadius: '4px', padding: '4px 0', minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '6px 16px', cursor: 'pointer', color: '#888888' }}>Documentation</div>
              <div style={{ padding: '6px 16px', cursor: 'pointer', color: '#888888' }}>About</div>
            </div>
          )}
        </div>

        <span style={{ flex: 1 }} />

        <span style={{ color: '#4a9eff', fontWeight: 'bold', fontSize: '13px', letterSpacing: '1px' }}>MONOLITH</span>

        <span style={{ flex: 1 }} />

        <TemplateDropdown onSelect={loadTemplate} />

        <span style={{ width: '1px', height: '16px', backgroundColor: '#333333', margin: '0 12px' }} />

        {executionState.mode === 'running' || executionState.mode === 'stepping' ? (
          <span
            style={{
              cursor: 'pointer',
              color: '#f59e0b',
              fontWeight: 'bold',
              padding: '2px 10px',
              border: '1px solid #f59e0b',
              borderRadius: '3px',
              fontSize: '10px',
            }}
            onClick={handleStop}
            title="Stop (Ctrl+.)"
          >
            ■ STOP
          </span>
        ) : (
          <span
            style={{
              cursor: 'pointer',
              color: errorCount > 0 ? '#ef4444' : '#4aff9f',
              fontWeight: 'bold',
              padding: '2px 10px',
              border: `1px solid ${errorCount > 0 ? '#ef4444' : '#4aff9f'}`,
              borderRadius: '3px',
              fontSize: '10px',
            }}
            onClick={handleRun}
            title="Run (Ctrl+Enter)"
          >
            ▶ RUN
          </span>
        )}

        <span style={{ width: '1px', height: '16px', backgroundColor: '#333333', margin: '0 12px' }} />

        <span
          style={{
            cursor: 'pointer',
            color: showLeftPanel ? '#4a9eff' : '#888888',
            fontSize: '14px',
            padding: '2px 6px',
          }}
          onClick={handleToggleLeftPanel}
          title="Toggle Left Panel"
        >
          ☰
        </span>
        <span
          style={{
            cursor: 'pointer',
            color: showRightPanel ? '#4a9eff' : '#888888',
            fontSize: '14px',
            padding: '2px 6px',
          }}
          onClick={handleToggleRightPanel}
          title="Toggle Right Panel"
        >
          🔍
        </span>
        <span
          style={{
            cursor: 'pointer',
            color: showBottomPanel ? '#4a9eff' : '#888888',
            fontSize: '14px',
            padding: '2px 6px',
          }}
          onClick={handleToggleBottomPanel}
          title="Toggle Bottom Panel"
        >
          ⌄
        </span>

        <span style={{ width: '1px', height: '16px', backgroundColor: '#333333', margin: '0 12px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor, boxShadow: executionState.mode === 'running' ? '0 0 4px #4aff9f' : 'none' }} />
          <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '10px' }}>{statusLabel}</span>
        </div>
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

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          width: showLeftPanel ? '220px' : '0px',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          flexShrink: 0,
          backgroundColor: '#252525',
          borderRight: showLeftPanel ? '1px solid #333333' : 'none',
          borderRadius: showLeftPanel ? '0 4px 4px 0' : '0',
        }}>
          {showLeftPanel && (
            <NodePalette
              paletteState={paletteState}
              onToggle={handleTogglePalette}
              onSearchChange={handlePaletteSearchChange}
              onCategoryChange={handlePaletteCategoryChange}
              onAddNode={handleAddNode}
            />
          )}
        </div>

        <IDELayout
          latticeState={latticeState}
          nodePositions={nodePositions}
          expressions={expressions}
          panelState={idePanelState}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          editingNodeId={editingNodeId}
          onToggleIDE={(): void => setIdePanelState((prev) => ({
            ...prev,
            isOpen: !prev.isOpen,
            showCodeEditor: !prev.isOpen ? true : prev.showCodeEditor,
          }))}
          onToggleExpand={function (_id: string): void {}}
          onTreeSelect={function (_selection: import("@ide/types").TreeSelection): void {}}
          onCodeChange={function (_code: string): void {}}
          onCodeSave={function (): void {}}
          onCodeApply={function (): void {}}
          onNodeSelect={handleNodeSelect}
          onEdgeSelect={handleEdgeSelect}
          onNodeMove={handleNodeMove}
          onNodeDoubleClick={handleNodeDoubleClick}
          onExpressionCommit={handleExpressionCommit}
          onExpressionCancel={handleExpressionCancel}
          onConnectionCreate={handleConnectionCreate}
          onConnectionValidationError={handleConnectionValidationError}
          onDeleteSelected={handleDeleteSelected}
          onDeselect={handleDeselect}
        >
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
        </IDELayout>

        {showPreview && (
          <ShadowAppPanel
            state={shadowState}
            executionResult={executionResult}
          />
        )}

        <div style={{
          width: showRightPanel ? '280px' : '0px',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          flexShrink: 0,
          backgroundColor: '#252525',
          borderLeft: showRightPanel ? '1px solid #333333' : 'none',
          borderRadius: showRightPanel ? '4px 0 0 4px' : '0',
        }}>
          {showRightPanel && (
            <InspectorPanel
              inspectorState={inspectorState}
              onExpressionChange={handleInspectorExpressionChange}
              onExpressionCommit={handleInspectorExpressionCommit}
              onSchemaChange={handleInspectorSchemaChange}
              onClose={handleInspectorClose}
              onNameComponent={handleNameComponent}
            />
          )}
        </div>
      </div>

      <div style={{
        display: showBottomPanel ? 'flex' : 'none',
        alignItems: 'center',
        gap: '4px',
        height: '28px',
        padding: '0 12px',
        backgroundColor: '#252525',
        borderTop: '1px solid #333333',
        fontSize: '11px',
        color: '#888888',
        flexShrink: 0,
        transition: 'display 0.2s ease',
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          boxShadow: executionState.mode === 'running' ? '0 0 4px #22c55e' : 'none',
        }} />
        <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '10px' }}>{statusLabel}</span>
        <span style={{ color: '#333' }}>|</span>
        <span style={{ fontSize: '10px' }}>{latticeState.nodes.size}n {latticeState.connections.length}e</span>
        {errorCount > 0 && (
          <>
            <span style={{ color: '#333' }}>|</span>
            <span style={{ color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}>
              {errorCount}err
            </span>
          </>
        )}
        {warningCount > 0 && (
          <>
            <span style={{ color: '#333' }}>|</span>
            <span style={{ color: '#f59e0b', fontSize: '10px' }}>
              {warningCount}warn
            </span>
          </>
        )}
        {errorCount === 0 && warningCount === 0 && (
          <>
            <span style={{ color: '#333' }}>|</span>
            <span style={{ color: '#22c55e', fontSize: '10px' }}>&#10003;</span>
          </>
        )}
        {executionResult !== null && (
          <>
            <span style={{ color: '#333' }}>|</span>
            <span style={{ color: '#00ffff', fontSize: '10px' }}>
              trace:{executionResult.trace.length}
            </span>
          </>
        )}
        <span style={{ marginLeft: 'auto', color: '#555', fontSize: '10px' }}>
          {expressions.size}exp v{latticeState.version}
        </span>
      </div>

      {consoleState.isOpen && (
        <ConsolePanel
          consoleState={consoleState}
          onTabChange={handleConsoleTabChange}
          onToggleCollapse={handleConsoleToggleCollapse}
          onClear={handleConsoleClear}
          onEntryClick={handleConsoleEntryClick}
          onClose={handleConsoleClose}
        />
      )}
    </div>
  );
}
