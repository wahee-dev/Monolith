import type { NodeTypeDefinition } from '../types';

export const HTTP_REQUEST_DEFINITION: NodeTypeDefinition = {
  kind: 'http-request',
  label: 'HTTP Request',
  category: 'io',
  description: 'Makes an HTTP request. Expression defines the method and options.',
  inputs: [
    { name: 'url', type: 'string', label: 'URL', required: true },
  ],
  outputs: [
    { name: 'status', type: 'number', label: 'Status', required: true },
    { name: 'body', type: 'any', label: 'Body', required: true },
    { name: 'headers', type: 'object', label: 'Headers', required: true },
  ],
  editableSchema: false,
} as const;

export const TIMER_DEFINITION: NodeTypeDefinition = {
  kind: 'timer',
  label: 'Timer',
  category: 'io',
  description: 'Fires periodically with an incrementing tick counter. Expression defines the interval in ms.',
  inputs: [],
  outputs: [
    { name: 'tick', type: 'number', label: 'Tick', required: true },
  ],
  editableSchema: false,
} as const;

export const CONSOLE_LOG_DEFINITION: NodeTypeDefinition = {
  kind: 'console-log',
  label: 'Console Log',
  category: 'io',
  description: 'Logs the input value to the debug panel. Produces no output.',
  inputs: [
    { name: 'value', type: 'any', label: 'Value', required: true },
  ],
  outputs: [],
  editableSchema: false,
} as const;

export const WEBHOOK_DEFINITION: NodeTypeDefinition = {
  kind: 'webhook',
  label: 'Webhook',
  category: 'io',
  description: 'Receives external data via an incoming webhook and outputs the payload.',
  inputs: [],
  outputs: [
    { name: 'payload', type: 'object', label: 'Payload', required: true },
  ],
  editableSchema: false,
} as const;

export const STORE_DEFINITION: NodeTypeDefinition = {
  kind: 'store',
  label: 'Store',
  category: 'io',
  description: 'Persists a value and re-emits it. Expression defines the storage key.',
  inputs: [
    { name: 'value', type: 'any', label: 'Value', required: true },
  ],
  outputs: [
    { name: 'stored', type: 'any', label: 'Stored', required: true },
  ],
  editableSchema: false,
} as const;

export const FETCH_DEFINITION: NodeTypeDefinition = {
  kind: 'fetch',
  label: 'Fetch',
  category: 'io',
  description: 'Fetches data from a URL and returns the response or an error.',
  inputs: [
    { name: 'url', type: 'string', label: 'URL', required: true },
  ],
  outputs: [
    { name: 'data', type: 'any', label: 'Data', required: true },
    { name: 'error', type: 'string', label: 'Error', required: false },
  ],
  editableSchema: false,
} as const;

export const IO_NODE_DEFINITIONS: ReadonlyArray<NodeTypeDefinition> = [
  HTTP_REQUEST_DEFINITION,
  TIMER_DEFINITION,
  CONSOLE_LOG_DEFINITION,
  WEBHOOK_DEFINITION,
  STORE_DEFINITION,
  FETCH_DEFINITION,
] as const;
