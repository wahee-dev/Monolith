'use client';

import { useCallback, useMemo, useState } from 'react';
import MeshPage from '@mesh/components/MeshPage';
import type { MeshPageProps } from '@mesh/components/MeshPage';
import { ShadowAppPanel, projectShadowApp } from '@preview/index';
import type { LatticeState } from '@lattice/types';

export default function Home(): React.ReactElement {
  const [latticeState, setLatticeState] = useState<LatticeState | null>(null);
  const [typeErrors, setTypeErrors] = useState<ReadonlyMap<string, string>>(new Map());

  const handleStateChange = useCallback<NonNullable<MeshPageProps['onStateChange']>>(
    (state, _exprs, errs) => {
      setLatticeState(state);
      setTypeErrors(errs);
    },
    [],
  );

  const shadowState = useMemo(() => {
    if (latticeState === null) {
      return {
        screens: [],
        flows: [],
        errors: [],
        valid: true,
        version: 0,
      };
    }
    const result = projectShadowApp(latticeState, typeErrors);
    if (result.ok) return result.value;
    return {
      screens: [],
      flows: [],
      errors: [{ nodeId: 'system', message: result.error.message }],
      valid: false,
      version: 0,
    };
  }, [latticeState, typeErrors]);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flex: 7, overflow: 'hidden' }}>
        <MeshPage onStateChange={handleStateChange} />
      </div>
      <ShadowAppPanel state={shadowState} />
    </div>
  );
}
