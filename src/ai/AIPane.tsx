'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { LatticeState } from '@lattice/types';
import type { Point } from '@mesh/types';

interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly notes?: string;
}

interface AIPaneProps {
  readonly latticeState: LatticeState;
  readonly nodePositions: Map<string, Point>;
  readonly expressions: Map<string, string>;
  readonly onAddNode: (kind: string) => void;
  readonly onAddConnection: (fromNodeId: string, fromPort: string, toNodeId: string, toPort: string) => void;
  readonly onSetExpression: (nodeId: string, expression: string) => void;
  readonly onDeleteNode: (nodeId: string) => void;
  readonly onDeleteConnection: (connectionId: string) => void;
}

const SYSTEM_PROMPT = `You are an AI assistant for the Monolith visual programming app. You can help users build data flow pipelines by adding nodes, connections, and expressions.

The app has these node types:
- source: Outputs a static value (has "emit" output port)
- transform: Transforms input data (has "input" input, "output" output)  
- sink: Receives and logs data (has "receive" input)
- gate: Conditionally passes data based on condition (has "condition", "data" inputs, "passed" output)
- merge: Merges two data streams (has "a", "b" inputs, "merged" output)
- split: Splits data to two outputs (has "input" input, "left", "right" outputs)

Available tools:
- add_node(kind, position): Add a new node. kind is one of: source, transform, sink, gate, merge, split. position is {x, y}.
- add_connection(fromNodeId, fromPort, toNodeId, toPort): Connect nodes. fromPort is output port name, toPort is input port name.
- set_expression(nodeId, expression): Set a node's expression (the JavaScript expression that computes its output).
- get_project_state(): Get current nodes, connections, and positions.
- delete_node(nodeId): Remove a node.
- delete_connection(connId): Remove a connection.

IMPORTANT: When user asks to add nodes or connections, YOU MUST call the appropriate tool. Do NOT just describe what you would do - actually call the tool.

Example tool calls:
- add_node("source", {x: 100, y: 200})
- add_node("transform", {x: 300, y: 200})
- add_connection("node-id-1", "output", "node-id-2", "input")
- set_expression("node-id-1", '"Hello " + "World"')
- delete_node("node-id-1")
- delete_connection("conn-id-1")

When user asks questions, answer them helpfully. When user asks to modify the project, use the tools.
Always respond in a helpful way explaining what you're doing.`;

export function AIPane({
  latticeState,
  nodePositions,
  expressions,
  onAddNode,
  onAddConnection,
  onSetExpression,
  onDeleteNode,
  onDeleteConnection,
}: AIPaneProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'system-welcome',
      role: 'assistant',
      content: "Hi! I'm your AI assistant for Monolith. I can help you build data flow pipelines, answer questions about the app, and modify your project. What would you like to do?",
    },
  ]);
  const [input, setInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const getProjectState = useCallback((): string => {
    const parts: string[] = ['Nodes:'];
    for (const [nodeId, node] of latticeState.nodes) {
      const pos = nodePositions.get(nodeId as string);
      const expr = expressions.get(nodeId as string);
      parts.push(`- ${nodeId} (${node.kind}) at (${pos?.x ?? 0}, ${pos?.y ?? 0})${expr ? ` expr: ${expr}` : ''}`);
    }
    parts.push('\nConnections:');
    for (const conn of latticeState.connections) {
      parts.push(`- ${conn.id}: ${conn.from}::${conn.fromPort} -> ${conn.to}::${conn.toPort}`);
    }
    return parts.join('\n');
  }, [latticeState, nodePositions, expressions]);

  const handleToolCall = useCallback(
    async (toolName: string, args: Record<string, unknown>): Promise<string> => {
      switch (toolName) {
        case 'add_node': {
          const kind = args['kind'] as string;
          const position = args['position'] as { x: number; y: number };
          onAddNode(kind);
          return `Added ${kind} node at position (${position.x}, ${position.y})`;
        }
        case 'add_connection': {
          const fromNodeId = args['fromNodeId'] as string;
          const fromPort = args['fromPort'] as string;
          const toNodeId = args['toNodeId'] as string;
          const toPort = args['toPort'] as string;
          onAddConnection(fromNodeId, fromPort, toNodeId, toPort);
          return `Connected ${fromNodeId}::${fromPort} to ${toNodeId}::${toPort}`;
        }
        case 'set_expression': {
          const nodeId = args['nodeId'] as string;
          const expression = args['expression'] as string;
          onSetExpression(nodeId, expression);
          return `Set expression for ${nodeId}: ${expression}`;
        }
        case 'get_project_state': {
          return getProjectState();
        }
        case 'delete_node': {
          const nodeId = args['nodeId'] as string;
          onDeleteNode(nodeId);
          return `Deleted node ${nodeId}`;
        }
        case 'delete_connection': {
          const connId = args['connId'] as string;
          onDeleteConnection(connId);
          return `Deleted connection ${connId}`;
        }
        default:
          return `Unknown tool: ${toolName}`;
      }
    },
    [onAddNode, onAddConnection, onSetExpression, onDeleteNode, onDeleteConnection, getProjectState],
  );

  const sendMessage = useCallback(async (): Promise<void> => {
    if (input.trim().length === 0 || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      ...(notes.trim().length > 0 ? { notes: notes.trim() } : {}),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setNotes('');
    setIsLoading(true);

    try {
      const conversation = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role, content: m.content + (m.notes ? `\n[Notes: ${m.notes}]` : '') })),
        { role: 'user', content: userMessage.content + (userMessage.notes ? `\n[Notes: ${userMessage.notes}]` : '') },
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversation,
          model: 'llama-3.1-70b-versatile',
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.choices?.[0]?.message?.content ?? 'No response',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const content = assistantMessage.content;
      const toolCallMatch = content.match(/add_node\s*\(\s*["']([^"']+)["'](?:\s*,\s*\{[\s\S]*?x[\s\S]*?:[\s\S]*?(\d+)[\s\S]*?,[\s\S]*?y[\s\S]*?:[\s\S]*?(\d+)[\s\S]*?\}|\s*,\s*(\d+)[\s\S]*?,[\s\S]*?(\d+)\s*)\s*\)/);
      if (toolCallMatch) {
        const kind = toolCallMatch[1]!;
        const x = parseInt(toolCallMatch[2] ?? toolCallMatch[4] ?? '200', 10);
        const y = parseInt(toolCallMatch[3] ?? toolCallMatch[5] ?? '200', 10);
        await handleToolCall('add_node', { kind, position: { x, y } });
      }

      const connMatch = content.match(/add_connection\s*\(\s*["']([^"']+)["'][,\s]*["']([^"']+)["'][,\s]*["']([^"']+)["'][,\s]*["']([^"']+)["']\s*\)/);
      if (connMatch) {
        await handleToolCall('add_connection', {
          fromNodeId: connMatch[1]!,
          fromPort: connMatch[2]!,
          toNodeId: connMatch[3]!,
          toPort: connMatch[4]!,
        });
      }

      const exprMatch = content.match(/set_expression\s*\(\s*["']([^"']+)["'][,\s]*["']([^"']+)["']\s*\)/);
      if (exprMatch) {
        await handleToolCall('set_expression', {
          nodeId: exprMatch[1]!,
          expression: exprMatch[2]!,
        });
      }

      const delNodeMatch = content.match(/delete_node\s*\(\s*["']([^"']+)["']\s*\)/);
      if (delNodeMatch) {
        await handleToolCall('delete_node', { nodeId: delNodeMatch[1]! });
      }

      const delConnMatch = content.match(/delete_connection\s*\(\s*["']([^"']+)["']\s*\)/);
      if (delConnMatch) {
        await handleToolCall('delete_connection', { connId: delConnMatch[1]! });
      }

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, notes, isLoading, messages, handleToolCall]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  return (
    <div
      style={{
        width: isOpen ? '320px' : '40px',
        height: '100%',
        backgroundColor: '#0c0c14',
        borderLeft: '1px solid #1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #1a1a2e',
          cursor: 'pointer',
        }}
        onClick={(): void => setIsOpen(!isOpen)}
      >
        <span style={{ fontSize: '11px', color: '#00ffff', fontWeight: 'bold' }}>AI Assistant</span>
        <span style={{ fontSize: '10px', color: '#666' }}>{isOpen ? '▼' : '▲'}</span>
      </div>

      {isOpen && (
        <>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  backgroundColor: message.role === 'user' ? '#1a1a2e' : '#111118',
                  border: message.role === 'user' ? '1px solid #2a2a3e' : '1px solid #222',
                }}
              >
                <div style={{ fontSize: '9px', color: message.role === 'user' ? '#00ffff' : '#888', marginBottom: '4px' }}>
                  {message.role === 'user' ? 'You' : 'AI'}
                </div>
                <div style={{ fontSize: '11px', color: '#cccccc', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                  {message.content}
                </div>
                {message.notes && (
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '4px', fontStyle: 'italic' }}>
                    Note: {message.notes}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  backgroundColor: '#111118',
                  border: '1px solid #222',
                }}
              >
                <div style={{ fontSize: '9px', color: '#888', marginBottom: '4px' }}>AI</div>
                <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>Thinking...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '8px', borderTop: '1px solid #1a1a2e' }}>
            <input
              type="text"
              value={input}
              onChange={(e): void => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI..."
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#111118',
                border: '1px solid #222',
                borderRadius: '4px',
                color: '#cccccc',
                fontSize: '11px',
                fontFamily: 'monospace',
                outline: 'none',
                marginBottom: '6px',
              }}
            />
            <input
              type="text"
              value={notes}
              onChange={(e): void => setNotes(e.target.value)}
              placeholder="Add notes (optional)"
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: '#0e0e14',
                border: '1px solid #222',
                borderRadius: '4px',
                color: '#888',
                fontSize: '10px',
                fontFamily: 'monospace',
                outline: 'none',
                marginBottom: '6px',
              }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={isLoading || input.trim().length === 0}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: isLoading || input.trim().length === 0 ? '#222' : '#00ffff',
                border: 'none',
                borderRadius: '4px',
                color: isLoading || input.trim().length === 0 ? '#666' : '#000',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                cursor: isLoading || input.trim().length === 0 ? 'default' : 'pointer',
              }}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}