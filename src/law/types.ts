export type CapabilityName =
  | 'lattice:transition:initiate'
  | 'lattice:transition:commit'
  | 'lattice:transition:rollback'
  | 'mesh:render:project'
  | 'mesh:render:update'
  | 'system:bootstrap'
  | 'system:shutdown';

export interface PermissionToken {
  readonly id: string;
  readonly capability: CapabilityName;
  readonly issuer: string;
  readonly subject: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly signature: string;
}

export interface LedgerEntry {
  readonly sequenceNumber: number;
  readonly token: PermissionToken;
  readonly action: 'granted' | 'revoked' | 'expired' | 'exercised';
  readonly timestamp: number;
  readonly hash: string;
  readonly previousHash: string;
}

export interface GovernanceLedger {
  readonly entries: ReadonlyArray<LedgerEntry>;
  readonly currentHash: string;
}

export type LawResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: LawError };

export interface LawError {
  readonly code: 'TOKEN_MISSING' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'CAPABILITY_DENIED' | 'LEDGER_CORRUPT' | 'CRYPTO_FAILURE' | 'VALIDATION_ERROR';
  readonly message: string;
  readonly capability?: CapabilityName;
}
