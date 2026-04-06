'use client';

import { useMemo } from 'react';
import type { LatticeState } from '@lattice/types';
import type { MeshView } from '../types';
import { projectMesh } from '../projector';

export function useMeshProjection(state: LatticeState): MeshView {
  return useMemo(() => {
    const result = projectMesh(state);
    if (result.ok) {
      return result.value;
    }
    return {
      nodes: [],
      edges: [],
      bounds: { x: 0, y: 0, width: 800, height: 600 },
    };
  }, [state]);
}
