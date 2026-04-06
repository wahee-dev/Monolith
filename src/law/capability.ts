import type { CapabilityName, PermissionToken, LawResult } from './types';

export interface CapabilityDefinition {
  readonly description: string;
  readonly requiresProof: boolean;
}

export const CAPABILITY_REGISTRY: ReadonlyMap<CapabilityName, CapabilityDefinition> = new Map<
  CapabilityName,
  CapabilityDefinition
>([
  ['lattice:transition:initiate', { description: 'Initiate a lattice state transition', requiresProof: true }],
  ['lattice:transition:commit', { description: 'Commit a lattice state transition', requiresProof: true }],
  ['lattice:transition:rollback', { description: 'Rollback a lattice state transition', requiresProof: true }],
  ['lattice:typecheck:validate', { description: 'Validate type-checking of lattice node expressions', requiresProof: false }],
  ['mesh:render:project', { description: 'Project lattice state to mesh view', requiresProof: false }],
  ['mesh:render:update', { description: 'Update the mesh view rendering', requiresProof: false }],
  ['system:bootstrap', { description: 'Bootstrap the Monolith system', requiresProof: true }],
  ['system:shutdown', { description: 'Shut down the Monolith system', requiresProof: true }],
]);

export function checkCapability(
  name: CapabilityName,
  token: PermissionToken,
): LawResult<boolean> {
  const definition = CAPABILITY_REGISTRY.get(name);

  if (definition === undefined) {
    return {
      ok: false,
      error: {
        code: 'CAPABILITY_DENIED',
        message: `Unknown capability: ${name}`,
        capability: name,
      },
    };
  }

  if (token.capability !== name) {
    return {
      ok: false,
      error: {
        code: 'CAPABILITY_DENIED',
        message: `Token grants '${token.capability}' but '${name}' is required`,
        capability: name,
      },
    };
  }

  return { ok: true, value: true };
}
