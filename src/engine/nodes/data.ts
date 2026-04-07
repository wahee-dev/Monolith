import type { NodeTypeDefinition } from '../types';

export const CONSTANT_DEFINITION: NodeTypeDefinition = {
  kind: 'constant',
  label: 'Constant',
  category: 'data',
  description: 'Outputs a fixed value set by the user via expression.',
  inputs: [],
  outputs: [
    { name: 'value', type: 'any', label: 'Value', required: true },
  ],
  editableSchema: false,
} as const;

export const VARIABLE_DEFINITION: NodeTypeDefinition = {
  kind: 'variable',
  label: 'Variable',
  category: 'data',
  description: 'Reads a named variable from the current scope and outputs its value.',
  inputs: [],
  outputs: [
    { name: 'value', type: 'any', label: 'Value', required: true },
  ],
  editableSchema: false,
} as const;

export const JSON_PARSE_DEFINITION: NodeTypeDefinition = {
  kind: 'json-parse',
  label: 'JSON Parse',
  category: 'data',
  description: 'Parses a JSON string into a structured object.',
  inputs: [
    { name: 'json', type: 'string', label: 'JSON', required: true },
  ],
  outputs: [
    { name: 'object', type: 'object', label: 'Object', required: true },
  ],
  editableSchema: false,
} as const;

export const JSON_STRINGIFY_DEFINITION: NodeTypeDefinition = {
  kind: 'json-stringify',
  label: 'JSON Stringify',
  category: 'data',
  description: 'Serializes an object into a JSON string.',
  inputs: [
    { name: 'object', type: 'object', label: 'Object', required: true },
  ],
  outputs: [
    { name: 'json', type: 'string', label: 'JSON', required: true },
  ],
  editableSchema: false,
} as const;

export const TEMPLATE_DEFINITION: NodeTypeDefinition = {
  kind: 'template',
  label: 'Template',
  category: 'data',
  description: 'Interpolates data into a template string using {{var}} syntax.',
  inputs: [
    { name: 'data', type: 'object', label: 'Data', required: true },
  ],
  outputs: [
    { name: 'result', type: 'string', label: 'Result', required: true },
  ],
  editableSchema: false,
} as const;

export const DATA_NODE_DEFINITIONS: ReadonlyArray<NodeTypeDefinition> = [
  CONSTANT_DEFINITION,
  VARIABLE_DEFINITION,
  JSON_PARSE_DEFINITION,
  JSON_STRINGIFY_DEFINITION,
  TEMPLATE_DEFINITION,
] as const;
