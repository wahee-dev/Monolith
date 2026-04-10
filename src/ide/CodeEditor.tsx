'use client';

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

interface CodeEditorPanelProps {
  code: string;
  language: 'javascript' | 'typescript' | 'tsx';
  onChange: (code: string) => void;
  onSave: () => void;
  onApply: () => void;
  readOnly?: boolean;
  error?: string;
}

interface Token {
  value: string;
  type: 'keyword' | 'string' | 'number' | 'operator' | 'comment' | 'function' | 'variable' | 'bracket' | 'punctuation';
}

function tokenize(code: string, _language: string): Token[][] {
  const lines = code.split('\n');
  const result: Token[][] = [];

  const keywords = new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'throw',
    'new', 'class', 'extends', 'static', 'this', 'true', 'false', 'null', 'undefined',
  ]);

  const functions = new Set([
    'console', 'Math', 'Array', 'Object', 'String', 'Number', 'Boolean', 'JSON', 'parseInt', 'parseFloat',
    'setTimeout', 'setInterval', 'fetch', 'Monolith',
  ]);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const tokens: Token[] = [];
    let j = 0;

    while (j < line.length) {
      if (line[j] === '/' && line[j + 1] === '/') {
        tokens.push({ value: line.slice(j), type: 'comment' });
        break;
      }

      if (line[j] === '"' || line[j] === "'" || line[j] === '`') {
        const quote = line[j]!;
        let end = j + 1;
        while (end < line.length && (line[end] !== quote || line[end - 1] === '\\')) {
          end++;
        }
        tokens.push({ value: line.slice(j, end + 1), type: 'string' });
        j = end + 1;
        continue;
      }

      if (/\d/.test(line[j]!)) {
        let end = j;
        while (end < line.length && /[\d.xXa-fA-F]/.test(line[end]!)) {
          end++;
        }
        tokens.push({ value: line.slice(j, end), type: 'number' });
        j = end;
        continue;
      }

      if (/[a-zA-Z_$]/.test(line[j]!)) {
        let end = j;
        while (end < line.length && /[a-zA-Z0-9_$]/.test(line[end]!)) {
          end++;
        }
        const word = line.slice(j, end);
        let type: Token['type'] = 'variable';
        if (keywords.has(word)) type = 'keyword';
        else if (functions.has(word)) type = 'function';
        tokens.push({ value: word, type });
        j = end;
        continue;
      }

      if (/[{}()\[\]]/.test(line[j]!)) {
        tokens.push({ value: line[j]!, type: 'bracket' });
        j++;
        continue;
      }

      if (/[+\-*/%=!<>&|?:]/.test(line[j]!)) {
        let end = j;
        while (end < line.length && /[+\-*/%=!<>&|?:]/.test(line[end]!)) {
          end++;
        }
        tokens.push({ value: line.slice(j, end), type: 'operator' });
        j = end;
        continue;
      }

      if (/[.,;]/.test(line[j]!)) {
        tokens.push({ value: line[j]!, type: 'punctuation' });
        j++;
        continue;
      }

      tokens.push({ value: line[j]!, type: 'punctuation' });
      j++;
    }

    result.push(tokens);
  }

  return result;
}

const TOKEN_COLORS: Record<Token['type'], string> = {
  keyword: '#f59e0b',
  string: '#22c55e',
  number: '#00ffff',
  operator: '#888888',
  comment: '#666666',
  function: '#4a9eff',
  variable: '#aaaaaa',
  bracket: '#f59e0b',
  punctuation: '#888888',
};

function TokenizedLine({
  tokens,
  lineNumber,
}: {
  tokens: Token[];
  lineNumber: number;
}): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.5',
      }}
    >
      <span
        style={{
          width: '40px',
          textAlign: 'right',
          paddingRight: '12px',
          color: '#444',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {lineNumber}
      </span>
      <span style={{ flex: 1 }}>
        {tokens.length === 0 ? (
          <span>&nbsp;</span>
        ) : (
          tokens.map((token, idx) => (
            <span key={idx} style={{ color: TOKEN_COLORS[token.type] }}>
              {token.value}
            </span>
          ))
        )}
      </span>
    </div>
  );
}

export function CodeEditorPanel({
  code,
  language,
  onChange,
  onSave,
  onApply,
  readOnly = false,
  error,
}: CodeEditorPanelProps): React.ReactElement {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const tokenizedLines = useMemo(() => tokenize(code, language), [code, language]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>): void => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const value = target.value;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = start + 2;
        });
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    },
    [onChange, onSave],
  );

  useEffect(() => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0c0c14',
        borderLeft: '1px solid #1a1a2e',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #1a1a2e',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#888888' }}>
          CODE EDITOR
        </span>
        <span style={{ fontSize: '10px', color: '#444' }}>{language.toUpperCase()}</span>
      </div>

      <div
        style={{
          position: 'relative',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <div
          ref={highlightRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            padding: '8px 0',
            overflow: 'auto',
            pointerEvents: 'none',
          }}
        >
          {tokenizedLines.map((tokens, idx) => (
            <TokenizedLine key={idx} tokens={tokens} lineNumber={idx + 1} />
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleChange}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            padding: '8px 0',
            paddingLeft: '52px',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.5',
            color: 'transparent',
            caretColor: '#00ffff',
            overflow: 'auto',
          }}
        />
      </div>

      {error && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#1a0a0a',
            borderTop: '1px solid #3a1515',
            fontSize: '10px',
            color: '#ef4444',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 12px',
          borderTop: '1px solid #1a1a2e',
          flexShrink: 0,
        }}
      >
        <button
          style={{
            background: 'transparent',
            border: '1px solid #333',
            color: '#888',
            padding: '4px 12px',
            fontSize: '10px',
            cursor: 'pointer',
            borderRadius: '3px',
          }}
          onClick={onSave}
        >
          Save (Ctrl+S)
        </button>
        <button
          style={{
            background: '#22c55e',
            border: '1px solid #22c55e',
            color: '#000',
            padding: '4px 12px',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            borderRadius: '3px',
          }}
          onClick={onApply}
        >
          Apply
        </button>
      </div>
    </div>
  );
}