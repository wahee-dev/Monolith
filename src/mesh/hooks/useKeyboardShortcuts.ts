'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardActions {
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onDelete: () => void;
  readonly onDeselect: () => void;
  readonly onTogglePalette: () => void;
  readonly onRun: () => void;
  readonly onStop: () => void;
}

function isEditableElement(): boolean {
  const el = document.activeElement;
  if (el === null) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT') return true;
  if (tag === 'SELECT') return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(
  actions: KeyboardActions,
  enabled: boolean,
): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;
      if (isEditableElement()) return;

      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const key = event.key;

      if (ctrl && !shift && key === 'z') {
        event.preventDefault();
        actions.onUndo();
        return;
      }

      if (ctrl && shift && key === 'Z') {
        event.preventDefault();
        actions.onRedo();
        return;
      }

      if (ctrl && key === 'y') {
        event.preventDefault();
        actions.onRedo();
        return;
      }

      if (key === 'Delete' || key === 'Backspace') {
        event.preventDefault();
        actions.onDelete();
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        actions.onDeselect();
        return;
      }

      if (ctrl && key === 'a') {
        return;
      }

      if (key === ' ' && !ctrl) {
        event.preventDefault();
        actions.onTogglePalette();
        return;
      }

      if (ctrl && key === 'Enter') {
        event.preventDefault();
        actions.onRun();
        return;
      }

      if (ctrl && key === '.') {
        event.preventDefault();
        actions.onStop();
        return;
      }
    },
    [actions, enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}
