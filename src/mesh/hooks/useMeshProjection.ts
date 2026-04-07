'use client';

import { useMemo } from 'react';
import type { LatticeState } from '@lattice/types';
import type { MeshView, TypeStatus } from '../types';
import { projectMesh } from '../projector';

export function useMeshProjection(
  state: LatticeState,
  expressions?: ReadonlyMap<string, string>,
  typeStatusMap?: ReadonlyMap<string, TypeStatus>,
  typeErrors?: ReadonlyMap<string, string>,
): MeshView {
  return useMemo(() => {
    const result = projectMesh(state, expressions, typeStatusMap, typeErrors);
    if (result.ok) {
      return result.value;
    }
    return {
      nodes: [],
      edges: [],
      bounds: { x: 0, y: 0, width: 800, height: 600 },
    };
  }, [state, expressions, typeStatusMap, typeErrors]);
}
