export type AIMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface AIMessage {
  readonly id: string;
  readonly role: AIMessageRole;
  readonly content: string;
  readonly timestamp: number;
  readonly toolCalls?: readonly AIToolCall[];
  readonly toolCallId?: string;
  readonly toolResult?: string;
}

export interface AIToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

export interface AIToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: 'object';
    readonly properties: Record<string, unknown>;
    readonly required?: readonly string[];
  };
}

export interface AIChatRequest {
  readonly messages: readonly AIMessage[];
}

export interface AIChatResponse {
  readonly content: string;
  readonly toolCalls?: readonly AIToolCall[];
}

export interface AISidebarState {
  readonly isOpen: boolean;
  readonly messages: readonly AIMessage[];
  readonly isLoading: boolean;
}

export function createAIMessage(
  role: AIMessageRole,
  content: string,
  options?: Partial<Pick<AIMessage, 'toolCalls' | 'toolCallId' | 'toolResult'>>,
): AIMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    timestamp: Date.now(),
    ...options,
  };
}