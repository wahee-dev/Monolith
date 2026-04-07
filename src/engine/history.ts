import type { LawResult } from '@law/types';
import type { LatticeState } from '@lattice/types';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface HistoryEntry {
  readonly state: LatticeState;
  readonly expressions: ReadonlyMap<string, string>;
  readonly nodePositions: ReadonlyMap<string, Point>;
  readonly label: string;
  readonly timestamp: number;
}

export interface HistoryState {
  readonly entries: ReadonlyArray<HistoryEntry>;
  readonly currentIndex: number;
  readonly maxEntries: number;
}

const DEFAULT_MAX_ENTRIES = 50;

export function createHistory(maxEntries: number = DEFAULT_MAX_ENTRIES): HistoryState {
  return {
    entries: [],
    currentIndex: -1,
    maxEntries,
  };
}

export function pushHistory(history: HistoryState, entry: HistoryEntry): HistoryState {
  const newIndex = history.currentIndex + 1;
  const truncated = history.entries.slice(0, newIndex);
  const appended = [...truncated, entry];
  const overflow = appended.length - history.maxEntries;
  const entries =
    overflow > 0 ? appended.slice(overflow) : appended;
  const adjustedIndex = overflow > 0 ? newIndex - overflow : newIndex;
  return {
    entries,
    currentIndex: adjustedIndex,
    maxEntries: history.maxEntries,
  };
}

export function undo(
  history: HistoryState,
): LawResult<{ readonly history: HistoryState; readonly entry: HistoryEntry }> {
  if (!canUndo(history)) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Cannot undo: already at the beginning of history',
      },
    };
  }
  const newIndex = history.currentIndex - 1;
  const entry = history.entries[newIndex]!;
  return {
    ok: true,
    value: {
      history: {
        ...history,
        currentIndex: newIndex,
      },
      entry,
    },
  };
}

export function redo(
  history: HistoryState,
): LawResult<{ readonly history: HistoryState; readonly entry: HistoryEntry }> {
  if (!canRedo(history)) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Cannot redo: already at the end of history',
      },
    };
  }
  const newIndex = history.currentIndex + 1;
  const entry = history.entries[newIndex]!;
  return {
    ok: true,
    value: {
      history: {
        ...history,
        currentIndex: newIndex,
      },
      entry,
    },
  };
}

export function canUndo(history: HistoryState): boolean {
  return history.currentIndex > 0;
}

export function canRedo(history: HistoryState): boolean {
  return history.currentIndex < history.entries.length - 1;
}

export function getHistoryLabel(history: HistoryState): string {
  if (history.entries.length === 0 || history.currentIndex < 0) {
    return '';
  }
  const entry = history.entries[history.currentIndex]!;
  return entry.label;
}
