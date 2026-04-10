import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = (process.env as Record<string, unknown>)['GROQ_API_KEY'] as string ?? '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-70b-versatile';

interface ToolDefinition {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: {
      readonly type: 'object';
      readonly properties: Record<string, unknown>;
      readonly required?: readonly string[];
    };
  };
}

interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly name?: string;
  readonly tool_call_id?: string;
}

interface ChatRequest {
  readonly messages: readonly ChatMessage[];
}

const systemMessage = `You are an AI assistant for the Monolith visual programming IDE.

Available tools:
- getPages(): List all pages
- getPage(name): Get page details  
- getNodes(): List all nodes in current page
- getNode(id): Get node details
- getConnections(): List connections
- getProjectState(): Full project snapshot
- addNode(kind, x?, y?, name?): Create node (kinds: source, transform, sink, gate, merge, split)
- deleteNode(nodeId): Remove node
- setNodePosition(nodeId, x, y): Move node
- setNodeExpression(nodeId, expression): Edit node code
- addConnection(fromNode, fromPort, toNode, toPort): Connect nodes
- deleteConnection(connectionId): Remove connection
- createPage(name): New page
- deletePage(name): Remove page
- navigateTo(pageName): Switch pages
- createComponent(name, page?): New component
- renameComponent(oldName, newName): Rename component
- setGlobalState(key, value): Set state
- getGlobalState(key): Get state
- run(): Execute graph
- stop(): Stop execution
- selectNode(nodeId): Select node
- focusPanel(panelName): Show panel
- toggleAI(): Toggle AI sidebar

When user asks to modify the graph, use the appropriate tools to help them.`;

const toolSpecs: readonly ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'getPages',
      description: 'List all pages in the project',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getPage',
      description: 'Get details of a specific page',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Page name' } },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getNodes',
      description: 'List all nodes in current page',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getNode',
      description: 'Get node details',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Node ID' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getConnections',
      description: 'List connections',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getProjectState',
      description: 'Get full project snapshot',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'addNode',
      description: 'Create a new node',
      parameters: {
        type: 'object',
        properties: {
          kind: { type: 'string', description: 'Node kind' },
          x: { type: 'number', description: 'X position' },
          y: { type: 'number', description: 'Y position' },
          name: { type: 'string', description: 'Node name' },
        },
        required: ['kind'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteNode',
      description: 'Remove a node',
      parameters: {
        type: 'object',
        properties: { nodeId: { type: 'string', description: 'Node ID' } },
        required: ['nodeId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setNodePosition',
      description: 'Move a node',
      parameters: {
        type: 'object',
        properties: {
          nodeId: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
        },
        required: ['nodeId', 'x', 'y'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setNodeExpression',
      description: 'Update node expression',
      parameters: {
        type: 'object',
        properties: {
          nodeId: { type: 'string' },
          expression: { type: 'string' },
        },
        required: ['nodeId', 'expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'addConnection',
      description: 'Connect nodes',
      parameters: {
        type: 'object',
        properties: {
          fromNode: { type: 'string' },
          fromPort: { type: 'string' },
          toNode: { type: 'string' },
          toPort: { type: 'string' },
        },
        required: ['fromNode', 'fromPort', 'toNode', 'toPort'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteConnection',
      description: 'Remove connection',
      parameters: {
        type: 'object',
        properties: { connectionId: { type: 'string' } },
        required: ['connectionId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createPage',
      description: 'Create a new page',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deletePage',
      description: 'Delete a page',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigateTo',
      description: 'Switch pages',
      parameters: {
        type: 'object',
        properties: { pageName: { type: 'string' } },
        required: ['pageName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createComponent',
      description: 'Create component',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          page: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'renameComponent',
      description: 'Rename component',
      parameters: {
        type: 'object',
        properties: {
          oldName: { type: 'string' },
          newName: { type: 'string' },
        },
        required: ['oldName', 'newName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setGlobalState',
      description: 'Set global state',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['key', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getGlobalState',
      description: 'Get global state',
      parameters: {
        type: 'object',
        properties: { key: { type: 'string' } },
        required: ['key'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run',
      description: 'Execute graph',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stop',
      description: 'Stop execution',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'selectNode',
      description: 'Select node in canvas',
      parameters: {
        type: 'object',
        properties: { nodeId: { type: 'string' } },
        required: ['nodeId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'focusPanel',
      description: 'Show panel',
      parameters: {
        type: 'object',
        properties: { panelName: { type: 'string' } },
        required: ['panelName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggleAI',
      description: 'Toggle AI sidebar',
      parameters: { type: 'object', properties: {} },
    },
  },
];

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: ChatRequest = await req.json();

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array required' },
        { status: 400 },
      );
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      ...body.messages.slice(-10),
    ];

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: toolSpecs,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Groq API error: ${errorText}` },
        { status: response.status },
      );
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 },
      );
    }

    const choice = data.choices[0]!;
    const message = choice.message;

    return NextResponse.json({
      content: message.content ?? '',
      toolCalls: message.tool_calls ?? null,
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error }, { status: 500 });
  }
}