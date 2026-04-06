import { guard } from '@law/guard';
import type { CapabilityName, GovernanceLedger, PermissionToken } from '@law/types';

export async function checkPermission(
  capability: CapabilityName,
  token: PermissionToken | undefined,
  ledger: GovernanceLedger,
): Promise<boolean> {
  const result = await guard(capability, token, ledger);
  return result.ok;
}

export async function hasInitiatePermission(
  token: PermissionToken | undefined,
  ledger: GovernanceLedger,
): Promise<boolean> {
  return checkPermission('lattice:transition:initiate', token, ledger);
}

export async function hasCommitPermission(
  token: PermissionToken | undefined,
  ledger: GovernanceLedger,
): Promise<boolean> {
  return checkPermission('lattice:transition:commit', token, ledger);
}

export async function hasRollbackPermission(
  token: PermissionToken | undefined,
  ledger: GovernanceLedger,
): Promise<boolean> {
  return checkPermission('lattice:transition:rollback', token, ledger);
}
