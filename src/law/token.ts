import type { PermissionToken, GovernanceLedger, LawResult, CapabilityName } from './types';
import { getSigningKey, signToken } from './crypto';
import { findToken, isTokenRevoked, appendEntry } from './ledger';
import { uuidV7 } from './crypto';

export async function createToken(params: {
  readonly capability: CapabilityName;
  readonly issuer: string;
  readonly subject: string;
  readonly ttlMs: number;
}): Promise<LawResult<PermissionToken>> {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + params.ttlMs;
  const id = uuidV7();

  const unsigned = {
    id,
    capability: params.capability,
    issuer: params.issuer,
    subject: params.subject,
    issuedAt,
    expiresAt,
  };

  try {
    const key = await getSigningKey();
    const signature = await signToken(unsigned, key);
    const token: PermissionToken = { ...unsigned, signature };
    return { ok: true, value: token };
  } catch {
    return {
      ok: false,
      error: {
        code: 'CRYPTO_FAILURE',
        message: 'Failed to sign permission token',
        capability: params.capability,
      },
    };
  }
}

export function validateToken(
  token: PermissionToken,
  ledger: GovernanceLedger,
): LawResult<PermissionToken> {
  const now = Date.now();

  if (token.expiresAt <= now) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: `Token ${token.id} expired at ${token.expiresAt}`,
        capability: token.capability,
      },
    };
  }

  if (token.expiresAt <= token.issuedAt) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: `Token ${token.id} has invalid expiry`,
        capability: token.capability,
      },
    };
  }

  if (isTokenRevoked(token.id, ledger)) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: `Token ${token.id} has been revoked`,
        capability: token.capability,
      },
    };
  }

  const entry = findToken(token.id, ledger);
  if (entry === undefined) {
    return { ok: true, value: token };
  }

  return { ok: true, value: token };
}

export async function revokeToken(
  tokenId: string,
  ledger: GovernanceLedger,
): Promise<LawResult<GovernanceLedger>> {
  const entry = findToken(tokenId, ledger);

  if (entry === undefined) {
    return {
      ok: false,
      error: {
        code: 'TOKEN_MISSING',
        message: `Token ${tokenId} not found in ledger`,
      },
    };
  }

  if (entry.action === 'revoked') {
    return {
      ok: false,
      error: {
        code: 'TOKEN_INVALID',
        message: `Token ${tokenId} is already revoked`,
      },
    };
  }

  return appendEntry(ledger, entry.token, 'revoked');
}
