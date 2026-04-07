import type { LatticeState, LatticeNode } from '@lattice/types';
import type { LawResult } from '@law/types';
import type { ShadowAppState, ShadowScreen, UIElement, DataFlow, PreviewError } from './types';

function formatFieldValue(value: unknown): string {
  if (value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object' && value !== null) return '{...}';
  return String(value);
}

function buildElementsFromSchema(
  node: LatticeNode,
  nodeValue: unknown,
): ReadonlyArray<UIElement> {
  const elements: UIElement[] = [];
  const valueObj = typeof nodeValue === 'object' && nodeValue !== null
    ? nodeValue as Record<string, unknown>
    : {};

  const inputKeys = Object.keys(node.schema.input).sort();
  for (let i = 0; i < inputKeys.length; i++) {
    const key = inputKeys[i]!;
    const field = node.schema.input[key]!;
    const fieldValue = valueObj[key];
    elements.push({
      id: `${node.id as string}-in-${field.name}`,
      kind: field.type === 'boolean' ? 'button' : 'input',
      label: field.name,
      value: formatFieldValue(fieldValue),
      children: [],
      valid: fieldValue !== undefined,
    });
  }

  const outputKeys = Object.keys(node.schema.output).sort();
  for (let i = 0; i < outputKeys.length; i++) {
    const key = outputKeys[i]!;
    const field = node.schema.output[key]!;
    const fieldValue = valueObj[key];
    elements.push({
      id: `${node.id as string}-out-${field.name}`,
      kind: 'text',
      label: field.name,
      value: formatFieldValue(fieldValue),
      children: [],
      valid: fieldValue !== undefined,
    });
  }

  return elements;
}

function buildScreenFromNode(
  node: LatticeNode,
  nodeValue: unknown,
): ShadowScreen {
  const elements = buildElementsFromSchema(node, nodeValue);
  const allValid = elements.every((el) => el.valid);

  return {
    id: node.id as string,
    title: `${node.kind}::${(node.id as string).slice(0, 8)}`,
    elements,
    valid: allValid,
  };
}

function buildFlowsFromConnections(
  state: LatticeState,
  nodeIds: ReadonlySet<string>,
): ReadonlyArray<DataFlow> {
  const flows: DataFlow[] = [];

  for (let i = 0; i < state.connections.length; i++) {
    const conn = state.connections[i]!;
    const fromId = conn.from as string;
    const toId = conn.to as string;

    if (!nodeIds.has(fromId) || !nodeIds.has(toId)) continue;

    flows.push({
      id: conn.id,
      fromScreenId: fromId,
      toScreenId: toId,
      label: `${conn.fromPort} → ${conn.toPort}`,
      valid: true,
    });
  }

  return flows;
}

function collectErrors(
  state: LatticeState,
  typeErrors: ReadonlyMap<string, string>,
): ReadonlyArray<PreviewError> {
  const errors: PreviewError[] = [];

  if (state.status === 'error') {
    errors.push({
      nodeId: 'system',
      message: 'Lattice in error state',
    });
  }

  const typeErrorEntries = Array.from(typeErrors.entries());
  for (let i = 0; i < typeErrorEntries.length; i++) {
    const entry = typeErrorEntries[i]!;
    if (entry[1] !== '') {
      errors.push({
        nodeId: entry[0],
        message: entry[1],
      });
    }
  }

  const nodeEntries = Array.from(state.nodes.entries());
  for (let i = 0; i < nodeEntries.length; i++) {
    const [nodeId, node] = nodeEntries[i]!;
    const nodeValue = state.values.get(nodeId);

    const inputKeys = Object.keys(node.schema.input);
    for (let j = 0; j < inputKeys.length; j++) {
      const key = inputKeys[j]!;
      const field = node.schema.input[key]!;
      if (field.required) {
        const valueObj = typeof nodeValue === 'object' && nodeValue !== null
          ? nodeValue as Record<string, unknown>
          : {};
        if (valueObj[key] === undefined) {
          errors.push({
            nodeId: nodeId as string,
            message: `Missing required input: ${field.name}`,
          });
        }
      }
    }
  }

  return errors;
}

export function projectShadowApp(
  latticeState: LatticeState,
  typeErrors: ReadonlyMap<string, string>,
): LawResult<ShadowAppState> {
  const screens: ShadowScreen[] = [];
  const nodeIdSet = new Set<string>();

  const nodeEntries = Array.from(latticeState.nodes.entries()).sort(
    (a, b) => (a[0] as string).localeCompare(b[0] as string),
  );

  for (let i = 0; i < nodeEntries.length; i++) {
    const [nodeId, node] = nodeEntries[i]!;
    const nodeValue = latticeState.values.get(nodeId);
    const screen = buildScreenFromNode(node, nodeValue);
    screens.push(screen);
    nodeIdSet.add(nodeId as string);
  }

  const flows = buildFlowsFromConnections(latticeState, nodeIdSet);
  const errors = collectErrors(latticeState, typeErrors);
  const allValid = screens.every((s) => s.valid) && errors.length === 0;

  return {
    ok: true,
    value: {
      screens,
      flows,
      errors,
      valid: allValid,
      version: latticeState.version,
    },
  };
}
