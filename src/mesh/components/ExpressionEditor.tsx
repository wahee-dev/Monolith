'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import type { ExpressionNodeView } from '../types';

interface ExpressionEditorProps {
  readonly node: ExpressionNodeView;
  readonly zoom: number;
  readonly onExpressionChange: (nodeId: string, expression: string) => void;
  readonly onExpressionCommit: (nodeId: string, expression: string) => void;
  readonly onClose: () => void;
}

export function ExpressionEditor({
  node,
  zoom,
  onExpressionChange,
  onExpressionCommit,
  onClose,
}: ExpressionEditorProps): React.ReactElement {
  const [value, setValue] = useState(node.expression);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isValid = node.typeStatus === 'valid';
  const hasError = node.typeStatus === 'invalid';

  useEffect(() => {
    if (textareaRef.current !== null) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      onExpressionChange(node.id, newValue);
    },
    [onExpressionChange, node.id],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onExpressionCommit(node.id, value);
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [onExpressionCommit, onClose, node.id, value],
  );

  const handleBlur = useCallback(() => {
    onExpressionCommit(node.id, value);
    onClose();
  }, [onExpressionCommit, onClose, node.id, value]);

  const { rect } = node;
  const editorWidth = rect.width - 16;
  const editorHeight = 80;
  const x = rect.x + 8;
  const y = rect.y + 32;

  return (
    <foreignObject
      x={x}
      y={y}
      width={editorWidth}
      height={editorHeight}
      style={{ overflow: 'visible' }}
    >
      <div
        style={{
          width: `${editorWidth / zoom}px`,
          minHeight: `${editorHeight / zoom}px`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          style={{
            position: 'relative',
            backgroundColor: '#1a1a2e',
            border: `1px solid ${hasError ? '#ff4444' : isValid ? '#00ff88' : '#333333'}`,
            borderRadius: 3,
            padding: 6,
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            style={{
              width: '100%',
              minHeight: 40,
              backgroundColor: '#0c0c14',
              color: '#e0e0e0',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'monospace',
              fontSize: 12,
              lineHeight: 1.4,
              textDecorationLine: hasError ? 'underline' : 'none',
              textDecorationColor: hasError ? '#ff4444' : undefined,
            }}
            spellCheck={false}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {node.inferredType !== null && (
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#888888' }}>
                {node.inferredType}
              </span>
            )}
            {isValid && (
              <span style={{ color: '#00ff88', fontSize: 14, marginLeft: 'auto' }}>&#x2713;</span>
            )}
            {hasError && (
              <span style={{ color: '#ff4444', fontSize: 14, marginLeft: 'auto' }}>&#x2717;</span>
            )}
          </div>
        </div>
      </div>
    </foreignObject>
  );
}
