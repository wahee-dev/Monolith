import type { LatticeNode } from '@lattice/types';

export interface AppStructure {
  readonly pages: readonly Page[];
}

export interface Page {
  readonly id: string;
  readonly name: string;
  readonly components: readonly Component[];
}

export type ComponentKind = 'ui' | 'logic' | 'layout';

export interface Component {
  readonly id: string;
  readonly name: string;
  readonly kind: ComponentKind;
  readonly nodes: ReadonlyArray<LatticeNode>;
  readonly code: string;
}

export interface IDETreeNode {
  readonly id: string;
  readonly type: 'page' | 'component' | 'node';
  readonly name: string;
  readonly kind?: ComponentKind | string;
  readonly children: readonly IDETreeNode[];
  readonly isExpanded: boolean;
}

export interface IDEPanelState {
  readonly isOpen: boolean;
  readonly leftWidth: number;
  readonly rightWidth: number;
  readonly showCodeEditor: boolean;
}

export interface TreeSelection {
  readonly type: 'page' | 'component' | 'node';
  readonly pageId: string;
  readonly componentId?: string;
  readonly nodeId?: string;
}

export function createPage(id: string, name: string, components: readonly Component[] = []): Page {
  return { id, name, components };
}

export function createComponent(
  id: string,
  name: string,
  kind: ComponentKind,
  nodes: readonly LatticeNode[] = [],
  code = '',
): Component {
  return { id, name, kind, nodes, code };
}

export function pageToTreeNode(page: Page): IDETreeNode {
  const childNodes: IDETreeNode[] = [];
  for (let i = 0; i < page.components.length; i++) {
    const comp = page.components[i]!;
    const nodeChildren: IDETreeNode[] = [];
    for (let j = 0; j < comp.nodes.length; j++) {
      const node = comp.nodes[j]!;
      nodeChildren.push({
        id: node.id as string,
        type: 'node',
        name: node.kind,
        children: [],
        isExpanded: true,
      });
    }
    childNodes.push({
      id: comp.id,
      type: 'component',
      name: comp.name,
      kind: comp.kind,
      children: nodeChildren,
      isExpanded: true,
    });
  }
  return {
    id: page.id,
    type: 'page',
    name: page.name,
    children: childNodes,
    isExpanded: true,
  };
}

export function buildTreeFromApp(app: AppStructure): readonly IDETreeNode[] {
  const result: IDETreeNode[] = [];
  for (let i = 0; i < app.pages.length; i++) {
    result.push(pageToTreeNode(app.pages[i]!));
  }
  return result;
}