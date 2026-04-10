export type ConsoleEntryType = 'success' | 'error' | 'info' | 'warning';

export interface ConsoleEntry {
  readonly id: string;
  readonly type: ConsoleEntryType;
  readonly message: string;
  readonly timestamp: number;
  readonly nodeId?: string;
  readonly details?: string;
}

export interface ConsoleState {
  readonly isOpen: boolean;
  readonly isCollapsed: boolean;
  readonly activeTab: ConsoleTab;
  readonly height: number;
  readonly entries: ReadonlyArray<ConsoleEntry>;
}

export type ConsoleTab = 'output' | 'errors' | 'warnings' | 'logs';

export interface ConsolePanelProps {
  readonly consoleState: ConsoleState;
  readonly onTabChange: (tab: ConsoleTab) => void;
  readonly onToggleCollapse: () => void;
  readonly onClear: () => void;
  readonly onEntryClick: (nodeId: string) => void;
  readonly onClose: () => void;
}