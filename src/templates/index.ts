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

export const TEMPLATES: ReadonlyArray<Template> = [
  GETTING_STARTED,
  DATA_FLOW,
  CONDITIONAL_GATE,
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
