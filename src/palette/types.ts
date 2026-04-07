import type { NodeCategory } from '@engine/types';

export interface PaletteState {
  readonly isOpen: boolean;
  readonly searchQuery: string;
  readonly selectedCategory: NodeCategory | 'all';
  readonly recentNodes: ReadonlyArray<string>;
}
