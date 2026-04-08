import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = process.env['GROQ_API_KEY'];
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY not configured' },
        { status: 500 },
      );
    }

    const body: ChatRequestBody = await request.json();
    const { messages, model, temperature = 0.7, max_tokens = 1024 } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages array' },
        { status: 400 },
      );
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model: model || 'llama-3.1-70b-versatile',
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Groq API error: ${response.status}`, details: errorData },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}