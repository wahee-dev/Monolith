import type { NodeTypeDefinition } from '../types';

export const GET_STATE_DEFINITION: NodeTypeDefinition = {
  kind: 'getState',
  label: 'Get State',
  category: 'state',
  description: 'Reads a value from the global state store.',
  inputs: [],
  outputs: [
    { name: 'value', type: 'any', label: 'Value', required: true },
  ],
  properties: [
    { name: 'key', type: 'string', label: 'State Key', required: true, default: '' },
  ],
  editableSchema: false,
} as const;

export const SET_STATE_DEFINITION: NodeTypeDefinition = {
  kind: 'setState',
  label: 'Set State',
  category: 'state',
  description: 'Writes a value to the global state store.',
  inputs: [
    { name: 'value', type: 'any', label: 'Value', required: true },
  ],
  outputs: [
    { name: 'done', type: 'void', label: 'Done', required: true },
  ],
  properties: [
    { name: 'key', type: 'string', label: 'State Key', required: true, default: '' },
    { name: 'persist', type: 'boolean', label: 'Persist to localStorage', required: false, default: false },
  ],
  editableSchema: false,
} as const;

export const ON_EVENT_DEFINITION: NodeTypeDefinition = {
  kind: 'onEvent',
  label: 'On Event',
  category: 'state',
  description: 'Listens for DOM events and triggers output.',
  inputs: [],
  outputs: [
    { name: 'trigger', type: 'any', label: 'Trigger', required: true },
  ],
  properties: [
    { name: 'event', type: 'string', label: 'Event Type', required: true, default: 'onClick', options: ['onClick', 'onChange', 'onSubmit', 'onHover'] },
  ],
  editableSchema: false,
} as const;

export const SUBSCRIBE_DEFINITION: NodeTypeDefinition = {
  kind: 'subscribe',
  label: 'Subscribe',
  category: 'state',
  description: 'Reacts to changes in a specific state key.',
  inputs: [
    { name: 'key', type: 'string', label: 'State Key', required: true },
  ],
  outputs: [
    { name: 'value', type: 'any', label: 'Value', required: true },
    { name: 'onChange', type: 'any', label: 'On Change', required: true },
  ],
  editableSchema: false,
} as const;

export const NAVIGATE_DEFINITION: NodeTypeDefinition = {
  kind: 'navigate',
  label: 'Navigate',
  category: 'state',
  description: 'Navigates to a different page or route.',
  inputs: [
    { name: 'path', type: 'string', label: 'Path', required: true },
  ],
  outputs: [
    { name: 'done', type: 'void', label: 'Done', required: true },
  ],
  editableSchema: false,
} as const;

export const STATE_NODE_DEFINITIONS: ReadonlyArray<NodeTypeDefinition> = [
  GET_STATE_DEFINITION,
  SET_STATE_DEFINITION,
  ON_EVENT_DEFINITION,
  SUBSCRIBE_DEFINITION,
  NAVIGATE_DEFINITION,
] as const;