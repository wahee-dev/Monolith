export interface ComponentDefinition {
  name: string;
  nodes: Record<string, unknown>;
  connections: unknown[];
  positions: Record<string, { x: number; y: number }>;
  createdAt: number;
}

export interface ProjectState {
  nodes: unknown[];
  connections: unknown[];
}

export type NotificationType = 'success' | 'error' | 'info';

class MonolithAPI {
  private static instance: MonolithAPI;
  private state: Map<string, unknown> = new Map();
  private components: Map<string, ComponentDefinition> = new Map();
  private theme: string = 'dark';
  private notifications: Array<{ message: string; type: NotificationType }> = [];
  private navigateCallback: ((path: string) => void) | null = null;
  private goBackCallback: (() => void) | null = null;
  private confirmCallback: ((message: string) => Promise<boolean>) | null = null;
  private notifyCallback: ((message: string, type: NotificationType) => void) | null = null;
  private projectNodes: unknown[] = [];
  private projectConnections: unknown[] = [];

  private constructor() {}

  static getInstance(): MonolithAPI {
    if (!MonolithAPI.instance) {
      MonolithAPI.instance = new MonolithAPI();
    }
    return MonolithAPI.instance;
  }

  getState(key: string): unknown {
    return this.state.get(key);
  }

  setState(key: string, value: unknown): void {
    this.state.set(key, value);
  }

  navigate(path: string): void {
    if (this.navigateCallback) {
      this.navigateCallback(path);
    }
  }

  getComponent(name: string): ComponentDefinition | undefined {
    return this.components.get(name);
  }

  registerComponent(name: string, config: Omit<ComponentDefinition, 'name' | 'createdAt'>): void {
    this.components.set(name, {
      name,
      ...config,
      createdAt: Date.now(),
    });
  }

  getAllComponents(): Map<string, ComponentDefinition> {
    return this.components;
  }

  getProjectState(): ProjectState {
    return {
      nodes: this.projectNodes,
      connections: this.projectConnections,
    };
  }

  setProjectState(nodes: unknown[], connections: unknown[]): void {
    this.projectNodes = nodes;
    this.projectConnections = connections;
  }

  notify(message: string, type: NotificationType = 'info'): void {
    this.notifications.push({ message, type });
    if (this.notifyCallback) {
      this.notifyCallback(message, type);
    }
  }

  getTheme(): string {
    return this.theme;
  }

  setTheme(newTheme: string): void {
    this.theme = newTheme;
  }

  goBack(): void {
    if (this.goBackCallback) {
      this.goBackCallback();
    }
  }

  async confirm(message: string): Promise<boolean> {
    if (this.confirmCallback) {
      return this.confirmCallback(message);
    }
    return window.confirm(message);
  }

  getTime(): number {
    return Date.now();
  }

  formatDate(date: Date, format: string): string {
    const d = date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  log(message: string): void {
    console.log('[Monolith]', message);
  }

  async fetch(url: string): Promise<unknown> {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      this.notify(`Fetch failed: ${(error as Error).message}`, 'error');
      throw error;
    }
  }

  async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  setTimeoutHandler(fn: () => void, ms: number): void {
    setTimeout(fn, ms);
  }

  onNavigate(callback: (path: string) => void): void {
    this.navigateCallback = callback;
  }

  onGoBack(callback: () => void): void {
    this.goBackCallback = callback;
  }

  onConfirm(callback: (message: string) => Promise<boolean>): void {
    this.confirmCallback = callback;
  }

  onNotify(callback: (message: string, type: NotificationType) => void): void {
    this.notifyCallback = callback;
  }
}

export function getMonolithAPI(): MonolithAPI {
  return MonolithAPI.getInstance();
}

export function createMonolithAPI(): MonolithAPI {
  return MonolithAPI.getInstance();
}
