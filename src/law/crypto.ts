import type { PermissionToken, LedgerEntry } from './types';

let keyPromise: Promise<CryptoKey> = crypto.subtle.generateKey(
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign', 'verify'],
);

export async function generateSigningKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  keyPromise = Promise.resolve(key);
  return key;
}

export function getSigningKey(): Promise<CryptoKey> {
  return keyPromise;
}

function serializeTokenData(token: {
  readonly id: string;
  readonly capability: PermissionToken['capability'];
  readonly issuer: string;
  readonly subject: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
}): string {
  return `${token.id}|${token.capability}|${token.issuer}|${token.subject}|${token.issuedAt}|${token.expiresAt}`;
}

export async function signToken(
  token: {
    readonly id: string;
    readonly capability: PermissionToken['capability'];
    readonly issuer: string;
    readonly subject: string;
    readonly issuedAt: number;
    readonly expiresAt: number;
  },
  key: CryptoKey,
): Promise<string> {
  const data = serializeTokenData(token);
  const encoded = new TextEncoder().encode(data);
  const signature = await crypto.subtle.sign('HMAC', key, encoded);
  const array = new Uint8Array(signature);
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifySignature(
  token: PermissionToken,
  key: CryptoKey,
  signature: string,
): Promise<boolean> {
  const tokenData = {
    id: token.id,
    capability: token.capability,
    issuer: token.issuer,
    subject: token.subject,
    issuedAt: token.issuedAt,
    expiresAt: token.expiresAt,
  };
  const expected = await signToken(tokenData, key);
  return constantTimeEquals(expected, signature);
}

export async function hashEntry(entry: LedgerEntry): Promise<string> {
  const data = `${entry.sequenceNumber}|${entry.token.id}|${entry.action}|${entry.timestamp}|${entry.previousHash}`;
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const array = new Uint8Array(hashBuffer);
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function uuidV7(): string {
  const timestamp = Date.now();
  const hex = timestamp.toString(16).padStart(12, '0');
  const timeHigh = hex.slice(0, 8);
  const timeMid = hex.slice(8, 12);

  const rand2 = new Uint8Array(2);
  crypto.getRandomValues(rand2);
  const versionedA = ((rand2[0]! << 8 | rand2[1]!) & 0x0fff | 0x7000).toString(16).padStart(4, '0');

  crypto.getRandomValues(rand2);
  const variantB = ((rand2[0]! << 8 | rand2[1]!) & 0x3fff | 0x8000).toString(16).padStart(4, '0');

  const rand6 = new Uint8Array(6);
  crypto.getRandomValues(rand6);
  const randomC = Array.from(rand6)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${timeHigh}-${timeMid}-${versionedA}-${variantB}-${randomC}`;
}
