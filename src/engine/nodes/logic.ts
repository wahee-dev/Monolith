import type { NodeTypeDefinition } from '../types';

export const IF_ELSE_DEFINITION: NodeTypeDefinition = {
  kind: 'if-else',
  label: 'If/Else',
  category: 'logic',
  description: 'Returns the "then" value if condition is true, otherwise the "else" value.',
  inputs: [
    { name: 'condition', type: 'boolean', label: 'Condition', required: true },
    { name: 'then', type: 'any', label: 'Then', required: true },
    { name: 'else', type: 'any', label: 'Else', required: true },
  ],
  outputs: [
    { name: 'result', type: 'any', label: 'Result', required: true },
  ],
  editableSchema: false,
} as const;

export const SWITCH_DEFINITION: NodeTypeDefinition = {
  kind: 'switch',
  label: 'Switch',
  category: 'logic',
  description: 'Routes a value to one of several output cases defined in the expression.',
  inputs: [
    { name: 'value', type: 'any', label: 'Value', required: true },
  ],
  outputs: [
    { name: 'case1', type: 'any', label: 'Case 1', required: false },
    { name: 'case2', type: 'any', label: 'Case 2', required: false },
    { name: 'case3', type: 'any', label: 'Case 3', required: false },
    { name: 'case4', type: 'any', label: 'Case 4', required: false },
  ],
  editableSchema: false,
} as const;

export const COMPARE_DEFINITION: NodeTypeDefinition = {
  kind: 'compare',
  label: 'Compare',
  category: 'logic',
  description: 'Compares two values and returns a boolean result. Expression defines the comparison operator.',
  inputs: [
    { name: 'a', type: 'any', label: 'A', required: true },
    { name: 'b', type: 'any', label: 'B', required: true },
  ],
  outputs: [
    { name: 'result', type: 'boolean', label: 'Result', required: true },
  ],
  editableSchema: false,
} as const;

export const AND_DEFINITION: NodeTypeDefinition = {
  kind: 'and',
  label: 'And',
  category: 'logic',
  description: 'Returns true when both boolean inputs are true.',
  inputs: [
    { name: 'a', type: 'boolean', label: 'A', required: true },
    { name: 'b', type: 'boolean', label: 'B', required: true },
  ],
  outputs: [
    { name: 'result', type: 'boolean', label: 'Result', required: true },
  ],
  editableSchema: false,
} as const;

export const OR_DEFINITION: NodeTypeDefinition = {
  kind: 'or',
  label: 'Or',
  category: 'logic',
  description: 'Returns true when either boolean input is true.',
  inputs: [
    { name: 'a', type: 'boolean', label: 'A', required: true },
    { name: 'b', type: 'boolean', label: 'B', required: true },
  ],
  outputs: [
    { name: 'result', type: 'boolean', label: 'Result', required: true },
  ],
  editableSchema: false,
} as const;

export const NOT_DEFINITION: NodeTypeDefinition = {
  kind: 'not',
  label: 'Not',
  category: 'logic',
  description: 'Inverts a boolean value.',
  inputs: [
    { name: 'value', type: 'boolean', label: 'Value', required: true },
  ],
  outputs: [
    { name: 'result', type: 'boolean', label: 'Result', required: true },
  ],
  editableSchema: false,
} as const;

export const LOGIC_NODE_DEFINITIONS: ReadonlyArray<NodeTypeDefinition> = [
  IF_ELSE_DEFINITION,
  SWITCH_DEFINITION,
  COMPARE_DEFINITION,
  AND_DEFINITION,
  OR_DEFINITION,
  NOT_DEFINITION,
] as const;
