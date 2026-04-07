export interface TemplateNode {
  readonly kind: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly expressions?: Readonly<Record<string, string>>;
}

export interface TemplateConnection {
  readonly fromNodeId: number;
  readonly fromPort: string;
  readonly toNodeId: number;
  readonly toPort: string;
}

export interface Template {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'tutorial' | 'starter' | 'example';
  readonly nodes: readonly TemplateNode[];
  readonly connections: readonly TemplateConnection[];
}
