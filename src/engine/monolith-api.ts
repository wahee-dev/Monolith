export interface ComponentConfig {
  name: string;
  nodes: Map<string, unknown>;
  connections: unknown[];
  positions: Map<string, { x: number; y: number }>;
  createdAt: number;
}

export type NotificationType = 'success' | 'error' | 'info';

class MonolithAPI {
  private static instance: MonolithAPI;
  private state: Map<string, unknown> = new Map();
  private components: Map<string, ComponentConfig> = new Map();
  private theme: string = 'dark';
  private notifications: Array<{ message: string; type: NotificationType }> = [];
  private navigateCallback: ((path: string) => void) | null = null;
  private notifyCallback: ((message: string, type: NotificationType) => void) | null = null;

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

  getComponent(name: string): ComponentConfig | undefined {
    return this.components.get(name);
  }

  registerComponent(name: string, config: Omit<ComponentConfig, 'name' | 'createdAt'>): void {
    this.components.set(name, {
      name,
      ...config,
      createdAt: Date.now(),
    });
  }

  getAllComponents(): Map<string, ComponentConfig> {
    return this.components;
  }

  notify(message: string, type: NotificationType = 'info'): void {
    this.notifications.push({ message, type });
    if (this.notifyCallback) {
      this.notifyCallback(message, type);
    }
  }

  getProjectState(): unknown {
    return {
      state: this.state,
      componentCount: this.components.size,
      theme: this.theme,
    };
  }

  getTheme(): string {
    return this.theme;
  }

  setTheme(newTheme: string): void {
    this.theme = newTheme;
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
