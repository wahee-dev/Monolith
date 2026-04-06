import type { LatticeState, LatticeNode, LatticeNodeId } from '@lattice/types';
import type { LawResult } from '@law/types';
import type {
  ShadowAppState,
  ShadowScreen,
  UIElement,
  DataFlow,
  PreviewError,
  ElementStyle,
} from './types';
import { parseAndTypeCheck } from '@lattice/expression';

const DEFAULT_STYLE: ElementStyle = {
  padding: 4,
  margin: 2,
  color: '#aaaaaa',
};

function schemaFieldsToElements(
  schemaFields: Record<string, { readonly name: string; readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array'; readonly required: true }>,
): ReadonlyArray<UIElement> {
  const elements: UIElement[] = [];
  const keys = Object.keys(schemaFields).sort();

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    const field = schemaFields[key]!;

    if (field.type === 'string') {
      elements.push({
        kind: 'input',
        label: field.name,
        inputType: 'text',
        boundTo: field.name,
      });
    } else if (field.type === 'number') {
      elements.push({
        kind: 'input',
        label: field.name,
        inputType: 'number',
        boundTo: field.name,
      });
    } else if (field.type === 'boolean') {
      elements.push({
        kind: 'button',
        label: `Toggle ${field.name}`,
        action: `toggle:${field.name}`,
        variant: 'secondary',
      });
    } else if (field.type === 'array') {
      elements.push({
        kind: 'list',
        items: field.name,
        itemType: 'item',
      });
    } else {
      elements.push({
        kind: 'text',
        content: `${field.name}: ${field.type}`,
        style: DEFAULT_STYLE,
      });
    }
  }

  return elements;
}

function buildScreenForSinkNode(node: LatticeNode): ShadowScreen {
  const inputElements = schemaFieldsToElements(node.schema.input);
  const outputElements = schemaFieldsToElements(node.schema.output);

  const actionElements: UIElement[] = [
    {
      kind: 'button',
      label: 'Submit',
      action: `submit:${node.id as string}`,
      variant: 'primary',
    },
  ];

  const allElements: UIElement[] = [
    ...inputElements,
    ...outputElements,
    ...actionElements,
  ];

  return {
    id: node.id as string,
    label: `${node.kind}::${(node.id as string).slice(0, 8)}`,
    elements: allElements,
  };
}

function buildDataFlows(
  connections: ReadonlyArray<{
    readonly id: string;
    readonly from: LatticeNodeId;
    readonly to: LatticeNodeId;
    readonly fromPort: string;
    readonly toPort: string;
  }>,
  nodes: ReadonlyMap<LatticeNodeId, LatticeNode>,
): ReadonlyArray<DataFlow> {
  const flows: DataFlow[] = [];

  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i]!;
    const fromNode = nodes.get(conn.from);
    const toNode = nodes.get(conn.to);
    if (fromNode === undefined || toNode === undefined) continue;

    const outputFieldType = fromNode.schema.output[conn.fromPort];
    const dataType = outputFieldType !== undefined ? outputFieldType.type : 'unknown';

    flows.push({
      from: conn.from as string,
      to: conn.to as string,
      dataType,
      isActive: true,
    });
  }

  return flows;
}

export function projectShadowApp(
  latticeState: LatticeState,
  expressions: ReadonlyMap<string, string>,
): LawResult<ShadowAppState> {
  const screens: ShadowScreen[] = [];
  const errors: PreviewError[] = [];

  const nodeEntries = Array.from(latticeState.nodes.entries());

  for (let i = 0; i < nodeEntries.length; i++) {
    const [nodeId, node] = nodeEntries[i]!;
    const nodeIdStr = nodeId as string;

    if (node.kind === 'sink') {
      screens.push(buildScreenForSinkNode(node));
    }

    const expression = expressions.get(nodeIdStr);
    if (expression !== undefined && expression.length > 0) {
      const result = parseAndTypeCheck(expression);
      if (!result.ok) {
        errors.push({ nodeId: nodeIdStr, message: result.error.message });
      }
    }
  }

  const dataFlows = buildDataFlows(latticeState.connections, latticeState.nodes);
  const isValid = errors.length === 0;

  return {
    ok: true,
    value: {
      screens,
      dataFlows,
      errors,
      isValid,
    },
  };
}
