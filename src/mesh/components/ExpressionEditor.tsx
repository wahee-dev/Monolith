'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ExpressionType } from '@lattice/expression';
import { useExpressionTypeCheck } from '../hooks/useExpressionTypeCheck';
import type { Rect } from '../types';

interface ExpressionEditorProps {
  readonly nodeId: string;
  readonly nodeRect: Rect;
  readonly initialExpression: string;
  readonly onCommit: (nodeId: string, expression: string) => void;
  readonly onCancel: () => void;
}

const DEBOUNCE_MS = 150;

type BorderState = 'neutral' | 'valid' | 'invalid';

const BORDER_COLORS: Record<BorderState, string> = {
  neutral: '#2a2a3e',
  valid: '#22c55e',
  invalid: '#ef4444',
};

export function ExpressionEditor({
  nodeId,
  nodeRect,
  initialExpression,
  onCommit,
  onCancel,
}: ExpressionEditorProps): React.ReactElement {
  const [text, setText] = useState<string>(initialExpression);
  const [borderState, setBorderState] = useState<BorderState>('neutral');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [inferredType, setInferredType] = useState<ExpressionType | null>(null);
  const { checkExpression } = useExpressionTypeCheck();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const runTypeCheck = useCallback(
    (source: string): void => {
      const result = checkExpression(source);
      if (result.isValid) {
        setBorderState(source.trim().length === 0 ? 'neutral' : 'valid');
        setErrorMessage('');
        setInferredType(result.inferredType);
      } else {
        setBorderState('invalid');
        setErrorMessage(result.error);
        setInferredType(null);
      }
    },
    [checkExpression],
  );

  useEffect(() => {
    if (textareaRef.current !== null) {
      textareaRef.current.focus();
    }
    runTypeCheck(initialExpression);
  }, [initialExpression, runTypeCheck]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      const value = e.target.value;
      setText(value);

      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout((): void => {
        runTypeCheck(value);
      }, DEBOUNCE_MS);
    },
    [runTypeCheck],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onCommit(nodeId, text);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [nodeId, text, onCommit, onCancel],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const borderColor = BORDER_COLORS[borderState];
  const editorX = nodeRect.x - 20;
  const editorY = nodeRect.y + nodeRect.height + 8;
  const editorWidth = nodeRect.width + 40;
  const editorHeight = 120;

  const boxShadow =
    borderState === 'valid'
      ? '0 0 8px rgba(34, 197, 94, 0.4)'
      : borderState === 'invalid'
        ? '0 0 8px rgba(239, 68, 68, 0.4)'
        : 'none';

  return (
    <foreignObject
      x={editorX}
      y={editorY}
      width={editorWidth}
      height={editorHeight}
    >
      <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '6px',
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={{
            backgroundColor: '#1a1a2e',
            color: '#e0e0e0',
            fontFamily: 'monospace',
            fontSize: '12px',
            border: `2px solid ${borderColor}`,
            borderRadius: '4px',
            padding: '8px',
            resize: 'none',
            outline: 'none',
            width: '100%',
            height: '60px',
            boxSizing: 'border-box',
            boxShadow,
          }}
        />
        {errorMessage.length > 0 && (
          <span
            style={{
              color: '#ef4444',
              fontSize: '10px',
              fontFamily: 'monospace',
            }}
          >
            {errorMessage}
          </span>
        )}
        {inferredType !== null && borderState === 'valid' && (
          <span
            style={{
              color: '#22c55e',
              fontSize: '10px',
              fontFamily: 'monospace',
            }}
          >
            type: {inferredType}
          </span>
        )}
      </div>
    </foreignObject>
  );
}
