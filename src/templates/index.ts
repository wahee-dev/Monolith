import type { LatticeNodeKind } from '@lattice/types';

export interface TemplateNode {
  readonly kind: LatticeNodeKind;
  readonly position: { readonly x: number; readonly y: number };
  readonly expression?: string;
}

export interface TemplateConnection {
  readonly fromNodeIndex: number;
  readonly fromPort: string;
  readonly toNodeIndex: number;
  readonly toPort: string;
}

export type TemplateCategory = 'Tutorial' | 'Starter' | 'Example';

export interface Template {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: TemplateCategory;
  readonly nodes: ReadonlyArray<TemplateNode>;
  readonly connections: ReadonlyArray<TemplateConnection>;
}

const GETTING_STARTED: Template = {
  id: 'getting-started',
  name: 'Getting Started',
  description: 'A simple source to sink pipeline',
  category: 'Tutorial',
  nodes: [
    { kind: 'source', position: { x: 80, y: 160 }, expression: '"Hello World"' },
    { kind: 'transform', position: { x: 320, y: 160 } },
    { kind: 'sink', position: { x: 560, y: 160 } },
  ],
  connections: [
    { fromNodeIndex: 0, fromPort: 'output', toNodeIndex: 1, toPort: 'input' },
    { fromNodeIndex: 1, fromPort: 'output', toNodeIndex: 2, toPort: 'input' },
  ],
};

const DATA_FLOW: Template = {
  id: 'data-flow',
  name: 'Data Flow',
  description: 'Split and merge data streams',
  category: 'Starter',
  nodes: [
    { kind: 'source', position: { x: 60, y: 200 }, expression: '"input data"' },
    { kind: 'split', position: { x: 260, y: 200 } },
    { kind: 'transform', position: { x: 480, y: 100 } },
    { kind: 'transform', position: { x: 480, y: 300 } },
    { kind: 'merge', position: { x: 700, y: 200 } },
    { kind: 'sink', position: { x: 900, y: 200 } },
  ],
  connections: [
    { fromNodeIndex: 0, fromPort: 'output', toNodeIndex: 1, toPort: 'input' },
    { fromNodeIndex: 1, fromPort: 'a', toNodeIndex: 2, toPort: 'input' },
    { fromNodeIndex: 1, fromPort: 'b', toNodeIndex: 3, toPort: 'input' },
    { fromNodeIndex: 2, fromPort: 'output', toNodeIndex: 4, toPort: 'a' },
    { fromNodeIndex: 3, fromPort: 'output', toNodeIndex: 4, toPort: 'b' },
    { fromNodeIndex: 4, fromPort: 'output', toNodeIndex: 5, toPort: 'input' },
  ],
};

const CONDITIONAL_GATE: Template = {
  id: 'conditional-gate',
  name: 'Conditional Gate',
  description: 'Use a gate to conditionally pass data',
  category: 'Example',
  nodes: [
    { kind: 'source', position: { x: 60, y: 160 }, expression: '"payload"' },
    { kind: 'source', position: { x: 60, y: 320 }, expression: 'true' },
    { kind: 'gate', position: { x: 320, y: 220 } },
    { kind: 'sink', position: { x: 560, y: 220 } },
  ],
  connections: [
    { fromNodeIndex: 0, fromPort: 'output', toNodeIndex: 2, toPort: 'data' },
    { fromNodeIndex: 1, fromPort: 'output', toNodeIndex: 2, toPort: 'enable' },
    { fromNodeIndex: 2, fromPort: 'output', toNodeIndex: 3, toPort: 'input' },
  ],
};

const COUNTER_APP: Template = {
  id: 'counter-app',
  name: 'Counter App',
  description: 'A functional counter using state and math',
  category: 'Example',
  nodes: [
    { kind: 'button', position: { x: 100, y: 100 }, expression: "'+' + (state.count || 0)" },
    { kind: 'button', position: { x: 100, y: 250 }, expression: "'-' + (state.count || 0)" },
    { kind: 'math', position: { x: 300, y: 100 }, expression: "(state.count || 0) + 1" },
    { kind: 'math', position: { x: 300, y: 250 }, expression: "(state.count || 0) - 1" },
    { kind: 'setState', position: { x: 500, y: 100 }, expression: "{ count: value }" },
    { kind: 'setState', position: { x: 500, y: 250 }, expression: "{ count: value }" },
    { kind: 'text', position: { x: 100, y: 400 }, expression: "'Count is: ' + (state.count || 0)" },
    { kind: 'sink', position: { x: 700, y: 250 } },
  ],
  connections: [
    { fromNodeIndex: 0, fromPort: 'onClick', toNodeIndex: 2, toPort: 'a' },
    { fromNodeIndex: 2, fromPort: 'result', toNodeIndex: 4, toPort: 'value' },
    { fromNodeIndex: 1, fromPort: 'onClick', toNodeIndex: 3, toPort: 'a' },
    { fromNodeIndex: 3, fromPort: 'result', toNodeIndex: 5, toPort: 'value' },
    { fromNodeIndex: 4, fromPort: 'done', toNodeIndex: 7, toPort: 'input' },
    { fromNodeIndex: 5, fromPort: 'done', toNodeIndex: 7, toPort: 'input' },
    { fromNodeIndex: 0, fromPort: 'element', toNodeIndex: 7, toPort: 'input' },
    { fromNodeIndex: 1, fromPort: 'element', toNodeIndex: 7, toPort: 'input' },
    { fromNodeIndex: 6, fromPort: 'element', toNodeIndex: 7, toPort: 'input' },
  ],
};

const GREETING_APP: Template = {
  id: 'greeting-app',
  name: 'Greeting App',
  description: 'Interactive greeting with input and state',
  category: 'Example',
  nodes: [
    { kind: 'input', position: { x: 100, y: 100 }, expression: "'World'" },
    { kind: 'setState', position: { x: 300, y: 100 }, expression: "{ name: value }" },
    { kind: 'text', position: { x: 100, y: 300 }, expression: "'Hello, ' + (state.name || 'World') + '!'" },
    { kind: 'sink', position: { x: 500, y: 200 } },
  ],
  connections: [
    { fromNodeIndex: 0, fromPort: 'onChange', toNodeIndex: 1, toPort: 'value' },
    { fromNodeIndex: 1, fromPort: 'done', toNodeIndex: 3, toPort: 'input' },
    { fromNodeIndex: 0, fromPort: 'element', toNodeIndex: 3, toPort: 'input' },
    { fromNodeIndex: 2, fromPort: 'element', toNodeIndex: 3, toPort: 'input' },
  ],
};

export const TEMPLATES: ReadonlyArray<Template> = [
  GETTING_STARTED,
  DATA_FLOW,
  CONDITIONAL_GATE,
  COUNTER_APP,
  GREETING_APP,
];

export function getTemplateById(id: string): Template | undefined {
  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i]!;
    if (t.id === id) return t;
  }
  return undefined;
}

export function getTemplatesByCategory(category: TemplateCategory): ReadonlyArray<Template> {
  return TEMPLATES.filter((t) => t.category === category);
}
