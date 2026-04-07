import type { NodeTypeDefinition } from '../types';

export const DELAY_DEFINITION: NodeTypeDefinition = {
  kind: 'delay',
  label: 'Delay',
  category: 'flow',
  description: 'Delays passing through data by a fixed number of milliseconds set in the expression.',
  inputs: [
    { name: 'input', type: 'any', label: 'Input', required: true },
  ],
  outputs: [
    { name: 'output', type: 'any', label: 'Output', required: true },
  ],
  editableSchema: false,
} as const;

export const BATCH_DEFINITION: NodeTypeDefinition = {
  kind: 'batch',
  label: 'Batch',
  category: 'flow',
  description: 'Collects items and releases them as an array once the batch size is reached. Expression defines the batch size.',
  inputs: [
    { name: 'item', type: 'any', label: 'Item', required: true },
  ],
  outputs: [
    { name: 'batch', type: 'array', label: 'Batch', required: true },
  ],
  editableSchema: false,
} as const;

export const DEBOUNCE_DEFINITION: NodeTypeDefinition = {
  kind: 'debounce',
  label: 'Debounce',
  category: 'flow',
  description: 'Debounces rapid inputs, emitting only after a quiet period. Expression defines the debounce delay in ms.',
  inputs: [
    { name: 'input', type: 'any', label: 'Input', required: true },
  ],
  outputs: [
    { name: 'output', type: 'any', label: 'Output', required: true },
  ],
  editableSchema: false,
} as const;

export const MERGE_OBJECTS_DEFINITION: NodeTypeDefinition = {
  kind: 'merge-objects',
  label: 'Merge Objects',
  category: 'flow',
  description: 'Merges two objects into a single combined object.',
  inputs: [
    { name: 'a', type: 'object', label: 'A', required: true },
    { name: 'b', type: 'object', label: 'B', required: true },
  ],
  outputs: [
    { name: 'merged', type: 'object', label: 'Merged', required: true },
  ],
  editableSchema: false,
} as const;

export const SPLIT_OBJECT_DEFINITION: NodeTypeDefinition = {
  kind: 'split-object',
  label: 'Split Object',
  category: 'flow',
  description: 'Splits an object into separate arrays of keys and values.',
  inputs: [
    { name: 'object', type: 'object', label: 'Object', required: true },
  ],
  outputs: [
    { name: 'keys', type: 'array', label: 'Keys', required: true },
    { name: 'values', type: 'array', label: 'Values', required: true },
  ],
  editableSchema: false,
} as const;

export const RETRY_DEFINITION: NodeTypeDefinition = {
  kind: 'retry',
  label: 'Retry',
  category: 'flow',
  description: 'Retries passing data through on failure. Expression defines the maximum number of retries.',
  inputs: [
    { name: 'input', type: 'any', label: 'Input', required: true },
  ],
  outputs: [
    { name: 'output', type: 'any', label: 'Output', required: true },
  ],
  editableSchema: false,
} as const;

export const FLOW_NODE_DEFINITIONS: ReadonlyArray<NodeTypeDefinition> = [
  DELAY_DEFINITION,
  BATCH_DEFINITION,
  DEBOUNCE_DEFINITION,
  MERGE_OBJECTS_DEFINITION,
  SPLIT_OBJECT_DEFINITION,
  RETRY_DEFINITION,
] as const;
