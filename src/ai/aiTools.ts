import type { AIToolDefinition } from './types';

export interface ToolExecutorContext {
  getPages: () => string[];
  getPage: (name: string) => string | null;
  getNodes: () => string[];
  getNode: (id: string) => unknown;
  getConnections: () => string[];
  getProjectState: () => unknown;
  addNode: (kind: string, x?: number, y?: number, name?: string) => string;
  deleteNode: (nodeId: string) => boolean;
  setNodePosition: (nodeId: string, x: number, y: number) => boolean;
  setNodeExpression: (nodeId: string, expression: string) => boolean;
  addConnection: (fromNode: string, fromPort: string, toNode: string, toPort: string) => string | null;
  deleteConnection: (connectionId: string) => boolean;
  createPage: (name: string) => boolean;
  deletePage: (name: string) => boolean;
  navigateTo: (pageName: string) => boolean;
  createComponent: (name: string, page?: string) => boolean;
  renameComponent: (oldName: string, newName: string) => boolean;
  setGlobalState: (key: string, value: unknown) => void;
  getGlobalState: (key: string) => unknown;
  run: () => boolean;
  stop: () => void;
  selectNode: (nodeId: string) => void;
  focusPanel: (panelName: string) => void;
  toggleAI: () => void;
}

type ToolHandler = (args: Record<string, unknown>, context: ToolExecutorContext) => string;

const toolHandlers: Record<string, ToolHandler> = {
  getPages: (_args, context) => {
    const pages = context.getPages();
    return JSON.stringify(pages);
  },

  getPage: (args, context) => {
    const name = (args as Record<string, unknown>)['name'] as string;
    const page = context.getPage(name);
    return JSON.stringify(page);
  },

  getNodes: (_args, context) => {
    const nodes = context.getNodes();
    return JSON.stringify(nodes);
  },

  getNode: (args, context) => {
    const id = (args as Record<string, unknown>)['id'] as string;
    const node = context.getNode(id);
    return JSON.stringify(node);
  },

  getConnections: (_args, context) => {
    const connections = context.getConnections();
    return JSON.stringify(connections);
  },

  getProjectState: (_args, context) => {
    const state = context.getProjectState();
    return JSON.stringify(state, null, 2);
  },

  addNode: (args, context) => {
    const kind = (args as Record<string, unknown>)['kind'] as string;
    const x = (args as Record<string, unknown>)['x'] as number | undefined;
    const y = (args as Record<string, unknown>)['y'] as number | undefined;
    const name = (args as Record<string, unknown>)['name'] as string | undefined;
    const nodeId = context.addNode(kind, x, y, name);
    return JSON.stringify({ success: true, nodeId });
  },

  deleteNode: (args, context) => {
    const nodeId = (args as Record<string, unknown>)['nodeId'] as string;
    const success = context.deleteNode(nodeId);
    return JSON.stringify({ success });
  },

  setNodePosition: (args, context) => {
    const nodeId = (args as Record<string, unknown>)['nodeId'] as string;
    const x = (args as Record<string, unknown>)['x'] as number;
    const y = (args as Record<string, unknown>)['y'] as number;
    const success = context.setNodePosition(nodeId, x, y);
    return JSON.stringify({ success });
  },

  setNodeExpression: (args, context) => {
    const nodeId = (args as Record<string, unknown>)['nodeId'] as string;
    const expression = (args as Record<string, unknown>)['expression'] as string;
    const success = context.setNodeExpression(nodeId, expression);
    return JSON.stringify({ success });
  },

  addConnection: (args, context) => {
    const fromNode = (args as Record<string, unknown>)['fromNode'] as string;
    const fromPort = (args as Record<string, unknown>)['fromPort'] as string;
    const toNode = (args as Record<string, unknown>)['toNode'] as string;
    const toPort = (args as Record<string, unknown>)['toPort'] as string;
    const result = context.addConnection(fromNode, fromPort, toNode, toPort);
    return JSON.stringify({ success: result !== null, connectionId: result });
  },

  deleteConnection: (args, context) => {
    const connectionId = (args as Record<string, unknown>)['connectionId'] as string;
    const success = context.deleteConnection(connectionId);
    return JSON.stringify({ success });
  },

  createPage: (args, context) => {
    const name = (args as Record<string, unknown>)['name'] as string;
    const success = context.createPage(name);
    return JSON.stringify({ success });
  },

  deletePage: (args, context) => {
    const name = (args as Record<string, unknown>)['name'] as string;
    const success = context.deletePage(name);
    return JSON.stringify({ success });
  },

  navigateTo: (args, context) => {
    const pageName = (args as Record<string, unknown>)['pageName'] as string;
    const success = context.navigateTo(pageName);
    return JSON.stringify({ success });
  },

  createComponent: (args, context) => {
    const name = (args as Record<string, unknown>)['name'] as string;
    const page = (args as Record<string, unknown>)['page'] as string | undefined;
    const success = context.createComponent(name, page);
    return JSON.stringify({ success });
  },

  renameComponent: (args, context) => {
    const oldName = (args as Record<string, unknown>)['oldName'] as string;
    const newName = (args as Record<string, unknown>)['newName'] as string;
    const success = context.renameComponent(oldName, newName);
    return JSON.stringify({ success });
  },

  setGlobalState: (args, context) => {
    const key = (args as Record<string, unknown>)['key'] as string;
    const value = (args as Record<string, unknown>)['value'] as unknown;
    context.setGlobalState(key, value);
    return JSON.stringify({ success: true });
  },

  getGlobalState: (args, context) => {
    const key = (args as Record<string, unknown>)['key'] as string;
    const value = context.getGlobalState(key);
    return JSON.stringify(value);
  },

  run: (_args, context) => {
    const success = context.run();
    return JSON.stringify({ success });
  },

  stop: (_args, context) => {
    context.stop();
    return JSON.stringify({ success: true });
  },

  selectNode: (args, context) => {
    const nodeId = (args as Record<string, unknown>)['nodeId'] as string;
    context.selectNode(nodeId);
    return JSON.stringify({ success: true });
  },

  focusPanel: (args, context) => {
    const panelName = (args as Record<string, unknown>)['panelName'] as string;
    context.focusPanel(panelName);
    return JSON.stringify({ success: true });
  },

  toggleAI: (_args, context) => {
    context.toggleAI();
    return JSON.stringify({ success: true });
  },
};

export const AITools: readonly AIToolDefinition[] = [
  {
    name: 'getPages',
    description: 'List all pages in the project',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'getPage',
    description: 'Get details of a specific page',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The name of the page' },
      },
      required: ['name'],
    },
  },
  {
    name: 'getNodes',
    description: 'List all nodes in the current page',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'getNode',
    description: 'Get details of a specific node',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The node ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'getConnections',
    description: 'List all connections in the current page',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'getProjectState',
    description: 'Get a full snapshot of the project state',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'addNode',
    description: 'Create a new node',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', description: 'The node kind (source, transform, sink, gate, merge, split)' },
        x: { type: 'number', description: 'X position (optional)' },
        y: { type: 'number', description: 'Y position (optional)' },
        name: { type: 'string', description: 'Optional name for the node' },
      },
      required: ['kind'],
    },
  },
  {
    name: 'deleteNode',
    description: 'Remove a node from the canvas',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node to delete' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'setNodePosition',
    description: 'Move a node to a new position',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node' },
        x: { type: 'number', description: 'New X position' },
        y: { type: 'number', description: 'New Y position' },
      },
      required: ['nodeId', 'x', 'y'],
    },
  },
  {
    name: 'setNodeExpression',
    description: 'Update the expression/code of a node',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node' },
        expression: { type: 'string', description: 'The new expression' },
      },
      required: ['nodeId', 'expression'],
    },
  },
  {
    name: 'addConnection',
    description: 'Create a connection between two nodes',
    parameters: {
      type: 'object',
      properties: {
        fromNode: { type: 'string', description: 'Source node ID' },
        fromPort: { type: 'string', description: 'Source port name' },
        toNode: { type: 'string', description: 'Target node ID' },
        toPort: { type: 'string', description: 'Target port name' },
      },
      required: ['fromNode', 'fromPort', 'toNode', 'toPort'],
    },
  },
  {
    name: 'deleteConnection',
    description: 'Remove a connection',
    parameters: {
      type: 'object',
      properties: {
        connectionId: { type: 'string', description: 'The ID of the connection to delete' },
      },
      required: ['connectionId'],
    },
  },
  {
    name: 'createPage',
    description: 'Create a new page',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name for the new page' },
      },
      required: ['name'],
    },
  },
  {
    name: 'deletePage',
    description: 'Delete a page',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the page to delete' },
      },
      required: ['name'],
    },
  },
  {
    name: 'navigateTo',
    description: 'Switch to a different page',
    parameters: {
      type: 'object',
      properties: {
        pageName: { type: 'string', description: 'Name of the page to navigate to' },
      },
      required: ['pageName'],
    },
  },
  {
    name: 'createComponent',
    description: 'Create a reusable component',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name for the component' },
        page: { type: 'string', description: 'Optional page name' },
      },
      required: ['name'],
    },
  },
  {
    name: 'renameComponent',
    description: 'Rename a component',
    parameters: {
      type: 'object',
      properties: {
        oldName: { type: 'string', description: 'Current component name' },
        newName: { type: 'string', description: 'New component name' },
      },
      required: ['oldName', 'newName'],
    },
  },
  {
    name: 'setGlobalState',
    description: 'Set a global state value',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'State key' },
        value: { type: 'string', description: 'State value (JSON string)' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'getGlobalState',
    description: 'Get a global state value',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'State key' },
      },
      required: ['key'],
    },
  },
  {
    name: 'run',
    description: 'Execute the graph',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'stop',
    description: 'Stop execution',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'selectNode',
    description: 'Select a node in the canvas',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node to select' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'focusPanel',
    description: 'Show/focus a specific panel',
    parameters: {
      type: 'object',
      properties: {
        panelName: { type: 'string', description: 'Panel name (palette, inspector, preview, ide)' },
      },
      required: ['panelName'],
    },
  },
  {
    name: 'toggleAI',
    description: 'Toggle the AI sidebar open/closed',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

export function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutorContext,
): string {
  const handler = toolHandlers[toolName];
  if (handler === undefined) {
    return JSON.stringify({ success: false, error: `Unknown tool: ${toolName}` });
  }
  try {
    return handler(args, context);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return JSON.stringify({ success: false, error });
  }
}

export function getToolsDescription(): string {
  return AITools.map((t) => {
    const params = Object.keys(t.parameters.properties).join(', ');
    return `- ${t.name}(${params}): ${t.description}`;
  }).join('\n');
}