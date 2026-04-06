'use client';

import type { MeshView } from '../types';
import { NodeView } from './NodeView';
import { EdgeView } from './EdgeView';

interface MeshCanvasProps {
  readonly view: MeshView;
}

export function MeshCanvas({ view }: MeshCanvasProps): React.ReactElement {
  const { nodes, edges, bounds } = view;

  return (
    <svg
      width={bounds.width}
      height={bounds.height}
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      style={{ backgroundColor: '#0a0a0f' }}
    >
      {edges.map((edge) => (
        <EdgeView key={edge.id} edge={edge} />
      ))}
      {nodes.map((node) => (
        <NodeView key={node.id} node={node} />
      ))}
    </svg>
  );
}
