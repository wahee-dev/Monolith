'use client';

import { useCallback, useMemo, useState } from 'react';
import { ComponentTreePanel } from './ComponentTree';
import type { IDETreeNode, TreeSelection, IDEPanelState } from './types';
import type { LatticeState, LatticeNodeId } from '@lattice/types';
import type { Point } from '@mesh/types';
import type { PortType } from '@engine/types';

interface IDELayoutProps {
  latticeState: LatticeState;
  nodePositions: Map<string, Point>;
  expressions: Map<string, string>;
  panelState: IDEPanelState;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  editingNodeId: string | null;
  onToggleIDE: () => void;
  onToggleExpand: (id: string) => void;
  onTreeSelect: (selection: TreeSelection) => void;
  onCodeChange: (code: string) => void;
  onCodeSave: () => void;
  onCodeApply: () => void;
  onNodeSelect: (nodeId: string | null) => void;
  onEdgeSelect: (edgeId: string | null) => void;
  onNodeMove: (nodeId: string, position: Point) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  onExpressionCommit: (nodeId: string, expression: string) => void;
  onExpressionCancel: () => void;
  onConnectionCreate: (fromNodeId: string, fromPort: string, toNodeId: string, toPort: string) => void;
  onConnectionValidationError: (fromType: PortType, toType: PortType) => void;
  onDeleteSelected: () => void;
  onDeselect: () => void;
  children?: React.ReactNode;
}

function buildTreeNodes(
  latticeState: LatticeState,
  _nodePositions: Map<string, Point>,
): IDETreeNode[] {
  const nodes: IDETreeNode[] = [];
  const nodeMap = new Map<string, IDETreeNode>();

  for (const [id, node] of latticeState.nodes) {
    const nodeId = id as string;
    const kindStr = node.kind;

    nodeMap.set(nodeId, {
      id: nodeId,
      type: 'node',
      name: nodeId,
      kind: kindStr,
      children: [],
      isExpanded: true,
    });
  }

  const componentNode: IDETreeNode = {
    id: 'main',
    type: 'component',
    name: 'Main',
    kind: 'ui',
    children: Array.from(nodeMap.values()),
    isExpanded: true,
  };

  nodes.push({
    id: 'main-page',
    type: 'page',
    name: 'Page',
    children: [componentNode],
    isExpanded: true,
  });

  return nodes;
}

function getNodeCode(
  latticeState: LatticeState,
  nodeId: string,
  expressions: Map<string, string>,
): string {
  const node = latticeState.nodes.get(nodeId as LatticeNodeId);
  if (!node) return '';

  const expr = expressions.get(nodeId);
  const schema = node.schema;
  const inputKeys = Object.keys(schema.input).join(', ');
  const outputKeys = Object.keys(schema.output).join(', ');

  if (!expr) {
    return `// ${node.kind} node\nfunction process(${inputKeys}) {\n  return { ${outputKeys}: value };\n}`;
  }

  return `// ${node.kind} node\nexport function process(${inputKeys}) {\n  return ${expr};\n}`;
}

export function IDELayout({
  latticeState,
  nodePositions,
  expressions,
  panelState,
  selectedNodeId,
  onToggleIDE,
  onToggleExpand,
  onCodeChange,
  onCodeSave,
  onCodeApply,
  onNodeSelect,
  children,
}: IDELayoutProps): React.ReactElement {
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(selectedNodeId);
  const [currentCode, setCurrentCode] = useState<string>('');

  const treeNodes = useMemo(
    () => buildTreeNodes(latticeState, nodePositions),
    [latticeState, nodePositions],
  );

  const handleTreeSelect = useCallback(
    (selection: TreeSelection): void => {
      setSelectedTreeId(selection.nodeId ?? selection.componentId ?? selection.pageId);
      if (selection.nodeId) {
        onNodeSelect(selection.nodeId);
      } else if (selection.componentId) {
        const comp = treeNodes
          .find((p) => p.id === selection.pageId)
          ?.children.find((c) => c.id === selection.componentId);
        if (comp && comp.children.length > 0) {
          onNodeSelect(comp.children[0]!.id);
        }
      } else {
        onNodeSelect(null);
      }
    },
    [onNodeSelect, treeNodes],
  );

  const handleCodeChange = useCallback(
    (code: string): void => {
      setCurrentCode(code);
      onCodeChange(code);
    },
    [onCodeChange],
  );

  const selectedCode = useMemo(() => {
    if (!selectedTreeId) return '';
    return getNodeCode(latticeState, selectedTreeId, expressions);
  }, [selectedTreeId, latticeState, expressions]);

  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}
    >
      {panelState.isOpen && (
        <div
          style={{
            width: panelState.leftWidth,
            flexShrink: 0,
          }}
        >
          <ComponentTreePanel
            tree={treeNodes}
            selectedId={selectedTreeId}
            onSelect={handleTreeSelect}
            onToggleExpand={onToggleExpand}
            onAddPage={function (): void {}}
            onAddComponent={function (_pageId: string): void {}}
            onAddNode={function (_pageId: string, _componentId: string): void {}}
            onDelete={function (_id: string, _type: 'page' | 'component' | 'node'): void {}}
            onRename={function (_id: string, _newName: string): void {}}
          />
        </div>
      )}

      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>

      {panelState.showCodeEditor && (
        <div
          style={{
            width: panelState.rightWidth,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              backgroundColor: '#0c0c14',
              borderLeft: '1px solid #1a1a2e',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                borderBottom: '1px solid #1a1a2e',
              }}
            >
              <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#888' }}>
                CODE
              </span>
              {selectedTreeId && (
                <span style={{ marginLeft: '8px', fontSize: '10px', color: '#4a9eff' }}>
                  {selectedTreeId}
                </span>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
              <textarea
                value={selectedCode || currentCode}
                onChange={(e): void => handleCodeChange(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#08080f',
                  border: '1px solid #1a1a2e',
                  color: '#aaa',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '8px',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '8px',
                borderTop: '1px solid #1a1a2e',
              }}
            >
              <button
                onClick={onCodeSave}
                style={{
                  background: 'transparent',
                  border: '1px solid #333',
                  color: '#888',
                  padding: '4px 12px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  borderRadius: '3px',
                }}
              >
                Save
              </button>
              <button
                onClick={onCodeApply}
                style={{
                  background: '#22c55e',
                  border: '1px solid #22c55e',
                  color: '#000',
                  padding: '4px 12px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '3px',
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onToggleIDE}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: panelState.isOpen || panelState.showCodeEditor ? '#00ffff' : '#222',
          border: panelState.isOpen || panelState.showCodeEditor ? '1px solid #00ffff' : '1px solid #333',
          color: panelState.isOpen || panelState.showCodeEditor ? '#000' : '#888',
          padding: '4px 8px',
          fontSize: '10px',
          cursor: 'pointer',
          borderRadius: '3px',
          zIndex: 10,
        }}
      >
        IDE
      </button>
    </div>
  );
}

export { buildTreeNodes };