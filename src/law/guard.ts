import type { CapabilityName, PermissionToken, GovernanceLedger, LawResult } from './types';
import { validateToken } from './token';
import { checkCapability } from './capability';

export async function guard(
  capability: CapabilityName,
  token: PermissionToken | undefined,
  ledger: GovernanceLedger,
): Promise<LawResult<PermissionToken>> {
  if (token === undefined) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_MISSING',
        message: `No token provided for capability '${capability}'`,
        capability,
      },
    };
  }

  const validationResult = await validateToken(token, ledger);
  if (!validationResult.ok) {
    return validationResult;
  }

  const capabilityResult = checkCapability(capability, token);
  if (!capabilityResult.ok) {
    return capabilityResult;
  }

  return { ok: true, value: token };
}
