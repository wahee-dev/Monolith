'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getTemplatesByCategory } from './index';
import type { Template, TemplateCategory } from './index';

const CATEGORIES: ReadonlyArray<TemplateCategory> = ['Tutorial', 'Starter', 'Example'];

interface TemplateDropdownProps {
  readonly onSelect: (template: Template) => void;
}

export function TemplateDropdown({ onSelect }: TemplateDropdownProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent): void => {
    if (containerRef.current !== null && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return (): void => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isOpen, handleClickOutside]);

  const handleSelect = useCallback(
    (template: Template): void => {
      onSelect(template);
      setIsOpen(false);
    },
    [onSelect],
  );

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={(): void => setIsOpen(!isOpen)}
        style={{
          background: 'transparent',
          border: `1px solid ${isOpen ? '#00ffff' : '#333'}`,
          borderRadius: '3px',
          color: isOpen ? '#00ffff' : '#aaaaaa',
          cursor: 'pointer',
          fontSize: '10px',
          padding: '1px 6px',
          fontFamily: 'monospace',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
        }}
      >
        Templates
        <span style={{ fontSize: '8px', lineHeight: 1 }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            minWidth: '220px',
            backgroundColor: '#1a1a2e',
            border: '1px solid #2a2a3e',
            borderRadius: '4px',
            zIndex: 100,
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          {CATEGORIES.map((category) => {
            const catTemplates = getTemplatesByCategory(category);
            if (catTemplates.length === 0) return null;
            return (
              <div key={category}>
                <div
                  style={{
                    padding: '4px 8px',
                    fontSize: '9px',
                    color: '#666666',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #222233',
                  }}
                >
                  {category}
                </div>
                {catTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={(): void => handleSelect(template)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      borderBottom: '1px solid #222233',
                    }}
                    onMouseEnter={(e): void => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#222244';
                    }}
                    onMouseLeave={(e): void => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#cccccc' }}>{template.name}</div>
                    <div style={{ fontSize: '9px', color: '#777777', marginTop: '1px' }}>
                      {template.description}
                    </div>
                    {template.notes && (
                      <div style={{ fontSize: '8px', color: '#4a9eff', marginTop: '2px', fontStyle: 'italic' }}>
                        {template.notes}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
