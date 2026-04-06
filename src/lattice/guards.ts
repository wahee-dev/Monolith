import { guard } from '@law/guard';
import type { CapabilityName, GovernanceLedger, PermissionToken } from '@law/types';

export function checkPermission(
  capability: CapabilityName,
  token: PermissionToken | undefined,
  ledger: GovernanceLedger,
): boolean {
  const result = guard(capability, token, ledger);
  return result.ok;
}

export function hasInitiatePermission(
  token: PermissionToken | undefined,
  ledger: GovernanceLedger,
): boolean {
  return checkPermission('lattice:transition:initiate', token, ledger);
}

export function hasCommitPermission(
  token: PermissionToken | undefined,
  ledger: GovernanceLedger,
): boolean {
  return checkPermission('lattice:transition:commit', token, ledger);
}

export function hasRollbackPermission(
  token: PermissionToken | undefined,
  ledger: GovernanceLedger,
): boolean {
  return checkPermission('lattice:transition:rollback', token, ledger);
}
