'use client';

import type { LatticeState } from '@lattice/types';
import { MeshCanvas, useMeshProjection } from '@mesh/index';

interface MeshPageProps {
  readonly latticeState: LatticeState;
}

export default function MeshPage({ latticeState }: MeshPageProps): React.ReactElement {
  const view = useMeshProjection(latticeState);

  return <MeshCanvas view={view} />;
}
