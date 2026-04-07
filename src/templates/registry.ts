import type { Template } from './types';

const GETTING_STARTED: Template = {
  id: 'getting-started',
  name: 'Getting Started',
  description:
    'A simple template that outputs a constant value to the console. Connects a Constant node to a Console Log node.',
  category: 'starter',
  nodes: [
    {
      kind: 'constant',
      position: { x: -200, y: 0 },
      expressions: { value: 'Hello World' },
    },
    {
      kind: 'console-log',
      position: { x: 100, y: 0 },
    },
  ],
  connections: [
    { fromNodeId: 0, fromPort: 'value', toNodeId: 1, toPort: 'value' },
  ],
} as const;

const PRINT_5_TIMES: Template = {
  id: 'print-5-times',
  name: 'Print 5 Times',
  description:
    'Uses a Template node to repeat a message. A Constant provides the text, a second Constant provides the repeat count, and a Console Log displays the result.',
  category: 'tutorial',
  nodes: [
    {
      kind: 'constant',
      position: { x: -300, y: 0 },
      expressions: { value: 'My Message' },
    },
    {
      kind: 'constant',
      position: { x: -300, y: 120 },
      expressions: { value: '5' },
    },
    {
      kind: 'template',
      position: { x: 0, y: 0 },
      expressions: { template: '{{text}} repeated {{count}} times' },
    },
    {
      kind: 'console-log',
      position: { x: 300, y: 0 },
    },
  ],
  connections: [
    { fromNodeId: 0, fromPort: 'value', toNodeId: 2, toPort: 'data' },
    { fromNodeId: 2, fromPort: 'result', toNodeId: 3, toPort: 'value' },
  ],
} as const;

const HTTP_FETCH: Template = {
  id: 'http-fetch',
  name: 'HTTP Fetch',
  description:
    'Fetches data from a URL using the Fetch node and logs the response. Demonstrates real network requests in the editor.',
  category: 'example',
  nodes: [
    {
      kind: 'constant',
      position: { x: -250, y: 0 },
      expressions: {
        value: 'https://api.github.com/repos/facebook/react',
      },
    },
    {
      kind: 'fetch',
      position: { x: 50, y: 0 },
    },
    {
      kind: 'console-log',
      position: { x: 350, y: 0 },
    },
  ],
  connections: [
    { fromNodeId: 0, fromPort: 'value', toNodeId: 1, toPort: 'url' },
    { fromNodeId: 1, fromPort: 'data', toNodeId: 2, toPort: 'value' },
  ],
} as const;

const CONDITIONAL_OUTPUT: Template = {
  id: 'conditional-output',
  name: 'Conditional Output',
  description:
    'Compares two values using the Compare node. Two Constants feed into Compare, and the boolean result is logged to the console.',
  category: 'example',
  nodes: [
    {
      kind: 'constant',
      position: { x: -300, y: -80 },
      expressions: { value: '42' },
    },
    {
      kind: 'constant',
      position: { x: -300, y: 60 },
      expressions: { value: '50' },
    },
    {
      kind: 'compare',
      position: { x: 0, y: 0 },
    },
    {
      kind: 'console-log',
      position: { x: 300, y: -40 },
    },
  ],
  connections: [
    { fromNodeId: 0, fromPort: 'value', toNodeId: 2, toPort: 'a' },
    { fromNodeId: 1, fromPort: 'value', toNodeId: 2, toPort: 'b' },
    { fromNodeId: 2, fromPort: 'result', toNodeId: 3, toPort: 'value' },
  ],
} as const;

export const TEMPLATES: readonly Template[] = [
  GETTING_STARTED,
  PRINT_5_TIMES,
  HTTP_FETCH,
  CONDITIONAL_OUTPUT,
] as const;

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
