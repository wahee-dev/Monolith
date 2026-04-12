'use client';

import { useMemo } from 'react';
import type { LatticeState } from '@lattice/types';
import type { Point } from '@mesh/types';
import type { PortType, GraphValidation, GraphExecutionResult } from '@engine/types';
import type { ExecutionState } from '@engine/execution';
import { MeshCanvas, useMeshProjection } from '@mesh/index';

export interface MeshPageProps {
  readonly latticeState: LatticeState;
  readonly expressions: ReadonlyMap<string, string>;
  readonly nodePositions: ReadonlyMap<string, Point>;
  readonly selectedNodeId: string | null;
  readonly selectedEdgeId: string | null;
  readonly editingNodeId: string | null;
  readonly executionState: ExecutionState;
  readonly executionResult: GraphExecutionResult | null;
  readonly typeStatus: ReadonlyMap<string, 'unchecked' | 'valid' | 'invalid'>;
  readonly typeErrors: ReadonlyMap<string, string>;
  readonly graphValidation: GraphValidation | null;
  readonly isBlocking: boolean;
  readonly errorMessage: string;
  readonly onNodeMove: (nodeId: string, newPosition: Point) => void;
  readonly onNodeSelect: (nodeId: string | null) => void;
  readonly onNodeDoubleClick: (nodeId: string) => void;
  readonly onExpressionCommit: (nodeId: string, expression: string) => void;
  readonly onExpressionCancel: () => void;
  readonly onConnectionCreate: (fromNodeId: string, fromPort: string, toNodeId: string, toPort: string) => void;
  readonly onConnectionValidationError?: (fromType: PortType, toType: PortType) => void;
  readonly onEdgeSelect: (edgeId: string | null) => void;
  readonly onDeleteSelected: () => void;
  readonly onDeselect: () => void;
}

export default function MeshPage({
  latticeState,
  expressions,
  nodePositions,
  selectedNodeId,
  selectedEdgeId,
  editingNodeId,
  executionState,
  typeStatus,
  typeErrors,
  graphValidation,
  isBlocking,
  onNodeMove,
  onNodeSelect,
  onNodeDoubleClick,
  onExpressionCommit,
  onExpressionCancel,
  onConnectionCreate,
  onConnectionValidationError,
  onEdgeSelect,
}: MeshPageProps): React.ReactElement {
  const view = useMeshProjection(latticeState, expressions, typeStatus, typeErrors);

  const activeScene = useMemo(() => latticeState.scenes.get(latticeState.activeSceneId)!, [latticeState]);

  const existingConnections = useMemo(
    () =>
      activeScene.connections.map((c: any) => ({
        from: c.from as string,
        to: c.to as string,
        fromPort: c.fromPort,
        toPort: c.toPort,
      })),
    [activeScene.connections],
  );

  const errorNodeIds = useMemo((): ReadonlySet<string> => {
    const ids = new Set<string>();
    if (graphValidation !== null) {
      for (let i = 0; i < graphValidation.errors.length; i++) {
        const err = graphValidation.errors[i]!;
        if (err.nodeId !== undefined) {
          ids.add(err.nodeId);
        }
      }
    }
    return ids;
  }, [graphValidation]);

  const errorEdgeIds = useMemo((): ReadonlySet<string> => {
    const ids = new Set<string>();
    if (graphValidation !== null) {
      for (let i = 0; i < graphValidation.errors.length; i++) {
        const err = graphValidation.errors[i]!;
        if (err.connectionId !== undefined) {
          ids.add(err.connectionId);
        }
      }
    }
    return ids;
  }, [graphValidation]);

  const executingNodeIds = useMemo((): ReadonlySet<string> => {
    const ids = new Set<string>();
    if (executionState.mode === 'running' || executionState.mode === 'stepping') {
      for (let i = 0; i < executionState.executionPlan.length; i++) {
        const step = executionState.executionPlan[i]!;
        if (step.status === 'running') {
          ids.add(step.nodeId);
        }
      }
    }
    return ids;
  }, [executionState]);

  const completedNodeIds = useMemo((): ReadonlySet<string> => {
    const ids = new Set<string>();
    if (executionState.mode !== 'stopped' || executionState.executionPlan.length > 0) {
      for (let i = 0; i < executionState.executionPlan.length; i++) {
        const step = executionState.executionPlan[i]!;
        if (step.status === 'complete') {
          ids.add(step.nodeId);
        }
      }
    }
    return ids;
  }, [executionState]);

  const errorExecutionNodeIds = useMemo((): ReadonlySet<string> => {
    const ids = new Set<string>();
    for (let i = 0; i < executionState.executionPlan.length; i++) {
      const step = executionState.executionPlan[i]!;
      if (step.status === 'error') {
        ids.add(step.nodeId);
      }
    }
    return ids;
  }, [executionState]);

  const isEmpty = activeScene.nodes.size === 0;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MeshCanvas
        view={view}
        selectedNodeId={selectedNodeId}
        selectedEdgeId={selectedEdgeId}
        editingNodeId={editingNodeId}
        nodePositions={nodePositions}
        isBlocking={isBlocking}
        errorNodeIds={errorNodeIds}
        errorEdgeIds={errorEdgeIds}
        executingNodeIds={executingNodeIds}
        completedNodeIds={completedNodeIds}
        errorExecutionNodeIds={errorExecutionNodeIds}
        onNodeMove={onNodeMove}
        onNodeSelect={onNodeSelect}
        onNodeDoubleClick={onNodeDoubleClick}
        onExpressionCommit={onExpressionCommit}
        onExpressionCancel={onExpressionCancel}
        onConnectionCreate={onConnectionCreate}
        onConnectionValidationError={onConnectionValidationError}
        onEdgeSelect={onEdgeSelect}
        existingConnections={existingConnections}
      />
      {isEmpty && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#555555',
          fontSize: '14px',
          fontFamily: 'monospace',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 5,
        }}>
          Add your first node using the palette (Space)
        </div>
      )}
    </div>
  );
}
