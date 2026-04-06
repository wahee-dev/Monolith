import type { PermissionToken, GovernanceLedger, LawResult, LedgerEntry } from './types';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function createLedger(): GovernanceLedger {
  return {
    entries: [],
    currentHash: GENESIS_HASH,
  };
}

export async function appendEntry(
  ledger: GovernanceLedger,
  token: PermissionToken,
  action: LedgerEntry['action'],
): Promise<LawResult<GovernanceLedger>> {
  const sequenceNumber = ledger.entries.length + 1;
  const timestamp = Date.now();

  const pendingEntry: LedgerEntry = {
    sequenceNumber,
    token,
    action,
    timestamp,
    hash: '',
    previousHash: ledger.currentHash,
  };

  try {
    const { hashEntry } = await import('./crypto');
    const hash = await hashEntry(pendingEntry);
    const entry: LedgerEntry = { ...pendingEntry, hash };

    return {
      ok: true,
      value: {
        entries: [...ledger.entries, entry],
        currentHash: hash,
      },
    };
  } catch {
    return {
      ok: false,
      error: {
        code: 'LEDGER_CORRUPT',
        message: 'Failed to compute hash for ledger entry',
      },
    };
  }
}

export async function verifyIntegrity(
  ledger: GovernanceLedger,
): Promise<LawResult<boolean>> {
  if (ledger.entries.length === 0) {
    return { ok: true, value: true };
  }

  try {
    const { hashEntry } = await import('./crypto');

    for (let i = 0; i < ledger.entries.length; i++) {
      const entry = ledger.entries[i]!;
      const expectedPreviousHash = i === 0
        ? GENESIS_HASH
        : ledger.entries[i - 1]!.hash;

      if (entry.previousHash !== expectedPreviousHash) {
        return {
          ok: false,
          error: {
            code: 'LEDGER_CORRUPT',
            message: `Hash chain broken at sequence ${entry.sequenceNumber}`,
          },
        };
      }

      const computedHash = await hashEntry(entry);
      if (entry.hash !== computedHash) {
        return {
          ok: false,
          error: {
            code: 'LEDGER_CORRUPT',
            message: `Entry hash mismatch at sequence ${entry.sequenceNumber}`,
          },
        };
      }
    }

    const lastEntry = ledger.entries[ledger.entries.length - 1]!;
    if (ledger.currentHash !== lastEntry.hash) {
      return {
        ok: false,
        error: {
          code: 'LEDGER_CORRUPT',
          message: 'Ledger current hash does not match last entry',
        },
      };
    }

    return { ok: true, value: true };
  } catch {
    return {
      ok: false,
      error: {
        code: 'LEDGER_CORRUPT',
        message: 'Failed to verify ledger integrity',
      },
    };
  }
}

export function findToken(
  tokenId: string,
  ledger: GovernanceLedger,
): LawResult<LedgerEntry> {
  for (const entry of ledger.entries) {
    if (entry.token.id === tokenId) {
      return { ok: true, value: entry };
    }
  }
  return {
    ok: false,
    error: {
      code: 'TOKEN_MISSING',
      message: `Token '${tokenId}' not found in ledger`,
    },
  };
}

export function isTokenRevoked(
  tokenId: string,
  ledger: GovernanceLedger,
): boolean {
  for (const entry of ledger.entries) {
    if (entry.token.id === tokenId && entry.action === 'revoked') {
      return true;
    }
  }
  return false;
}
