import type { NodeTypeDefinition } from '../types';

export const MAP_DEFINITION: NodeTypeDefinition = {
  kind: 'map',
  label: 'Map',
  category: 'transform',
  description: 'Transforms each element of an array using the expression as a mapping function.',
  inputs: [
    { name: 'array', type: 'array', label: 'Array', required: true },
  ],
  outputs: [
    { name: 'result', type: 'array', label: 'Result', required: true },
  ],
  editableSchema: false,
} as const;

export const FILTER_DEFINITION: NodeTypeDefinition = {
  kind: 'filter',
  label: 'Filter',
  category: 'transform',
  description: 'Filters array elements using the expression as a predicate.',
  inputs: [
    { name: 'array', type: 'array', label: 'Array', required: true },
  ],
  outputs: [
    { name: 'result', type: 'array', label: 'Result', required: true },
  ],
  editableSchema: false,
} as const;

export const REDUCE_DEFINITION: NodeTypeDefinition = {
  kind: 'reduce',
  label: 'Reduce',
  category: 'transform',
  description: 'Reduces an array to a single value using the expression as an accumulator function.',
  inputs: [
    { name: 'array', type: 'array', label: 'Array', required: true },
    { name: 'initial', type: 'any', label: 'Initial', required: true },
  ],
  outputs: [
    { name: 'result', type: 'any', label: 'Result', required: true },
  ],
  editableSchema: false,
} as const;

export const SORT_DEFINITION: NodeTypeDefinition = {
  kind: 'sort',
  label: 'Sort',
  category: 'transform',
  description: 'Sorts an array using the expression as a comparator function.',
  inputs: [
    { name: 'array', type: 'array', label: 'Array', required: true },
  ],
  outputs: [
    { name: 'result', type: 'array', label: 'Result', required: true },
  ],
  editableSchema: false,
} as const;

export const STRING_TRANSFORM_DEFINITION: NodeTypeDefinition = {
  kind: 'string-transform',
  label: 'String Transform',
  category: 'transform',
  description: 'Transforms a string using operations like uppercase, lowercase, trim, split, join, replace, or regex.',
  inputs: [
    { name: 'input', type: 'string', label: 'Input', required: true },
  ],
  outputs: [
    { name: 'output', type: 'string', label: 'Output', required: true },
  ],
  editableSchema: false,
} as const;

export const MATH_DEFINITION: NodeTypeDefinition = {
  kind: 'math',
  label: 'Math',
  category: 'transform',
  description: 'Performs a math operation on two numbers. Expression defines the operation.',
  inputs: [
    { name: 'a', type: 'number', label: 'A', required: true },
    { name: 'b', type: 'number', label: 'B', required: true },
  ],
  outputs: [
    { name: 'result', type: 'number', label: 'Result', required: true },
  ],
  editableSchema: false,
} as const;

export const TRANSFORM_NODE_DEFINITIONS: ReadonlyArray<NodeTypeDefinition> = [
  MAP_DEFINITION,
  FILTER_DEFINITION,
  REDUCE_DEFINITION,
  SORT_DEFINITION,
  STRING_TRANSFORM_DEFINITION,
  MATH_DEFINITION,
] as const;
