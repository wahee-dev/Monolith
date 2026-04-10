'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import type { AIMessage } from './types';
import { createAIMessage } from './types';
import { getToolsDescription } from './aiTools';

interface AISidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onRun: (message: string) => Promise<string>;
  projectContext: string;
}

const systemPrompt = `You are an AI assistant for the Monolith visual programming IDE.

You can control the entire application using these tools:

${getToolsDescription()}

General guidelines:
- When asked to create nodes, use appropriate kinds: source (outputs data), transform (modifies data), sink (consumes data), gate (conditional), merge (combines), split (branches)
- When modifying nodes, return JSON results with success status
- For running the graph, use the run() tool
- Always respond with clear, helpful messages

Current project state:`;

export default function AISidebar({
  isOpen,
  onToggle,
  onRun,
  projectContext,
}: AISidebarProps): React.ReactElement {
  const [messages, setMessages] = useState<readonly AIMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showTyping, setShowTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = useCallback((): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0 && projectContext.length > 0) {
      const systemMsg = createAIMessage('system', systemPrompt + '\n\n' + projectContext);
      setMessages([systemMsg]);
    }
  }, [isOpen, messages.length, projectContext]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (input.trim().length === 0 || isLoading) return;

    const userMessage = createAIMessage('user', input.trim());
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setShowTyping(true);

    try {
      const response = await onRun(input.trim());

      const assistantMessage = createAIMessage('assistant', response);
      setMessages([...newMessages, assistantMessage]);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      const errorMessage = createAIMessage('assistant', `Error: ${errorMsg}`);
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setShowTyping(false);
    }
  }, [input, messages, isLoading, onRun]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const formatTimestamp = useCallback((ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const renderContent = useCallback((content: string): React.ReactNode => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      const code = match[2] ?? '';
      parts.push(
        <pre
          key={match.index}
          style={{
            backgroundColor: '#1a1a1a',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
            overflow: 'auto',
            margin: '4px 0',
            border: '1px solid #333',
          }}
        >
          <code>{code}</code>
        </pre>,
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          right: '12px',
          top: '58px',
          width: '40px',
          height: '40px',
          backgroundColor: '#252525',
          border: '1px solid #333',
          borderRadius: '4px',
          color: '#4a9eff',
          cursor: 'pointer',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
        title="Toggle AI Assistant"
      >
        AI
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '350px',
        backgroundColor: '#0c0c14',
        borderLeft: '1px solid #1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid #1a1a2e',
          backgroundColor: '#111',
        }}
      >
        <span style={{ color: '#4a9eff', fontSize: '12px', fontWeight: 'bold' }}>
          AI Assistant
        </span>
        <button
          onClick={onToggle}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '2px 6px',
          }}
          title="Close"
        >
          x
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems:
                msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '90%',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                lineHeight: 1.4,
                wordBreak: 'break-word',
                backgroundColor:
                  msg.role === 'user'
                    ? '#4a9eff'
                    : msg.role === 'system'
                    ? '#222'
                    : '#252525',
                color: msg.role === 'user' ? '#fff' : '#ddd',
                border:
                  msg.role === 'assistant' ? '1px solid #333' : 'none',
              }}
            >
              {renderContent(msg.content)}
            </div>
            <span
              style={{
                fontSize: '9px',
                color: '#555',
                marginTop: '2px',
              }}
            >
              {formatTimestamp(msg.timestamp)}
            </span>
          </div>
        ))}

        {showTyping && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                backgroundColor: '#252525',
                color: '#888',
                border: '1px solid #333',
              }}
            >
              <span style={{ animation: 'pulse 1s infinite' }}>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: '12px',
          borderTop: '1px solid #1a1a2e',
          backgroundColor: '#111',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to modify your graph..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#ddd',
              fontSize: '12px',
              outline: 'none',
              fontFamily: 'monospace',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || input.trim().length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: isLoading || input.trim().length === 0 ? '#333' : '#4a9eff',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: isLoading || input.trim().length === 0 ? 'default' : 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}