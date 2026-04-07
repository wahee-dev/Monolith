import type { LatticeState, LatticeNode } from '@lattice/types';
import type { LawResult } from '@law/types';
import type { NodeView, EdgeView, MeshView, FieldView } from './types';
import { computeLayout } from './layout';
import { computeBezierPath, computeBounds } from './geometry';
import { renderStringField } from './renderers/string';
import { renderNumberField } from './renderers/number';
import { renderBooleanField } from './renderers/boolean';
import { renderObjectField } from './renderers/object';
import { renderArrayField } from './renderers/array';
import { NODE_BASE_HEIGHT, FIELD_HEIGHT } from './layout';

const KIND_COLORS: Record<string, string> = {
  source: '#4a9eff',
  transform: '#ff9f4a',
  sink: '#4aff9f',
  gate: '#ff4a9f',
  merge: '#9f4aff',
  split: '#9fff4a',
};

function renderFieldByType(type: FieldView['type'], value: unknown): string {
  switch (type) {
    case 'string':
      return renderStringField(value);
    case 'number':
      return renderNumberField(value);
    case 'boolean':
      return renderBooleanField(value);
    case 'object':
      return renderObjectField(value);
    case 'array':
      return renderArrayField(value);
    default:
      return String(value);
  }
}

function buildNodeFields(
  node: LatticeNode,
  nodeValue: unknown,
  rect: { readonly x: number; readonly y: number },
): ReadonlyArray<FieldView> {
  const fields: FieldView[] = [];
  let yOffset = NODE_BASE_HEIGHT - 8;

  const inputKeys = Object.keys(node.schema.input).sort();
  for (let i = 0; i < inputKeys.length; i++) {
    const key = inputKeys[i]!;
    const schemaField = node.schema.input[key]!;
    const value = typeof nodeValue === 'object' && nodeValue !== null
      ? (nodeValue as Record<string, unknown>)[key]
      : undefined;
    fields.push({
      name: schemaField.name,
      type: schemaField.type,
      value: renderFieldByType(schemaField.type, value),
      position: { x: rect.x + 12, y: rect.y + yOffset },
    });
    yOffset += FIELD_HEIGHT;
  }

  const outputKeys = Object.keys(node.schema.output).sort();
  for (let i = 0; i < outputKeys.length; i++) {
    const key = outputKeys[i]!;
    const schemaField = node.schema.output[key]!;
    const value = typeof nodeValue === 'object' && nodeValue !== null
      ? (nodeValue as Record<string, unknown>)[key]
      : undefined;
    fields.push({
      name: schemaField.name,
      type: schemaField.type,
      value: renderFieldByType(schemaField.type, value),
      position: { x: rect.x + 12, y: rect.y + yOffset },
    });
    yOffset += FIELD_HEIGHT;
  }

  return fields;
}

function buildNodeViews(
  state: LatticeState,
  layoutMap: ReadonlyMap<string, { readonly x: number; readonly y: number; readonly width: number; readonly height: number }>,
): ReadonlyArray<NodeView> {
  const views: NodeView[] = [];
  const nodeEntries = Array.from(state.nodes.entries()).sort(
    (a, b) => (a[0] as string).localeCompare(b[0] as string),
  );

  for (let i = 0; i < nodeEntries.length; i++) {
    const [nodeId, node] = nodeEntries[i]!;
    const rect = layoutMap.get(nodeId as string);
    if (rect === undefined) continue;

    const nodeValue = state.values.get(nodeId);
    const fields = buildNodeFields(node, nodeValue, rect);
    const color = KIND_COLORS[node.kind] ?? '#888888';

    views.push({
      id: nodeId as string,
      rect,
      kind: node.kind,
      label: `${node.kind}::${(nodeId as string).slice(0, 8)}`,
      fields,
      color,
      expression: '',
      typeStatus: 'unchecked' as const,
      typeError: '',
    });
  }

  return views;
}

function buildEdgeViews(
  state: LatticeState,
  nodeViews: ReadonlyArray<NodeView>,
): ReadonlyArray<EdgeView> {
  const edges: EdgeView[] = [];
  const viewMap = new Map<string, NodeView>();
  for (let i = 0; i < nodeViews.length; i++) {
    const view = nodeViews[i]!;
    viewMap.set(view.id, view);
  }

  const sortedConnections = [...state.connections].sort(
    (a, b) => a.id.localeCompare(b.id),
  );

  for (let i = 0; i < sortedConnections.length; i++) {
    const conn = sortedConnections[i]!;
    const fromView = viewMap.get(conn.from as string);
    const toView = viewMap.get(conn.to as string);

    if (fromView === undefined || toView === undefined) continue;

    const curve = computeBezierPath(fromView.rect, toView.rect);
    edges.push({
      id: conn.id,
      fromNodeId: conn.from as string,
      toNodeId: conn.to as string,
      curve,
      label: `${conn.fromPort} → ${conn.toPort}`,
      color: '#666666',
    });
  }

  return edges;
}

export function projectMesh(state: LatticeState): LawResult<MeshView> {
  const nodeList = Array.from(state.nodes.values());
  const layoutRects = computeLayout(nodeList, state.connections);

  const layoutMap = new Map<string, { readonly x: number; readonly y: number; readonly width: number; readonly height: number }>();
  const entries = Array.from(layoutRects.entries());
  for (let i = 0; i < entries.length; i++) {
    const [nodeId, rect] = entries[i]!;
    layoutMap.set(nodeId as string, rect);
  }

  const nodes = buildNodeViews(state, layoutMap);
  const edges = buildEdgeViews(state, nodes);
  const bounds = computeBounds(nodes);

  return {
    ok: true,
    value: { nodes, edges, bounds },
  };
}
