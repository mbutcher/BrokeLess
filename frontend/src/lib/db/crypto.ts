/**
 * IndexedDB encryption using WebAuthn PRF key derivation.
 *
 * Key derivation flow:
 *   1. User authenticates with a passkey (WebAuthn assertion).
 *   2. The PRF extension output is passed to `deriveKeyFromPRF`.
 *   3. HKDF(SHA-256) derives a 256-bit AES-GCM key from the PRF output.
 *   4. The key is stored module-level (in memory only — never persisted).
 *   5. Sensitive transaction fields (payee, description, notes) are encrypted
 *      with this key before being stored in Dexie and decrypted on read.
 *   6. On logout, `clearIndexedDbKey` zeroes out the key reference.
 *
 * When no key is available (password-only login, or PRF unsupported by
 * authenticator), reads fall back to the Workbox HTTP cache and writes
 * are not queued offline.
 */

/** Sensitive transaction fields that are encrypted in IndexedDB. */
export const TX_ENCRYPTED_FIELDS = ['payee', 'description', 'notes'] as const;
export type TxEncryptedField = (typeof TX_ENCRYPTED_FIELDS)[number];

// ─── Module-level key state ───────────────────────────────────────────────────

let _key: CryptoKey | null = null;

export function hasIndexedDbKey(): boolean {
  return _key !== null;
}

export function setIndexedDbKey(key: CryptoKey): void {
  _key = key;
}

export function clearIndexedDbKey(): void {
  _key = null;
}

// ─── Key derivation ───────────────────────────────────────────────────────────

const PRF_INFO = new TextEncoder().encode('budgetapp-indexeddb-v1');

/**
 * Derive an AES-256-GCM CryptoKey from a WebAuthn PRF extension output.
 *
 * Uses HKDF(SHA-256) with the userId as salt so the key is scoped to
 * the specific user on this device.
 *
 * @param prfOutput - The `prf.results.first` ArrayBuffer from the WebAuthn assertion.
 * @param userId - The authenticated user's UUID (used as HKDF salt).
 */
export async function deriveKeyFromPRF(
  prfOutput: ArrayBuffer,
  userId: string
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    prfOutput,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(userId),
      info: PRF_INFO,
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─── Field encryption / decryption ───────────────────────────────────────────

/**
 * Encrypt a string using the current IndexedDB key.
 * Returns a base64-encoded string of the format: base64(iv || ciphertext).
 * Throws if no key is available.
 */
export async function encryptField(value: string): Promise<string> {
  if (!_key) throw new Error('IndexedDB encryption key not available');

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    _key,
    new TextEncoder().encode(value)
  );

  // Pack IV + ciphertext into a single buffer
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded iv+ciphertext string produced by `encryptField`.
 * Throws if no key is available.
 */
export async function decryptField(value: string): Promise<string> {
  if (!_key) throw new Error('IndexedDB encryption key not available');

  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, _key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

/**
 * Encrypt the given fields on an object in-place (returns a new object).
 * Fields that are null remain null. Non-string values are left unchanged.
 * Safe to call when key is unavailable — stores values as-is (unencrypted).
 */
export async function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: readonly string[]
): Promise<T> {
  if (!_key) return obj;
  const result = { ...obj };
  for (const field of fields) {
    const val = result[field];
    if (typeof val === 'string') {
      (result as Record<string, unknown>)[field] = await encryptField(val);
    }
  }
  return result;
}

/**
 * Decrypt the given fields on an object in-place (returns a new object).
 * Fields that are null remain null. If decryption fails (e.g. wrong key or
 * plaintext stored when key was unavailable), the original value is preserved.
 */
export async function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: readonly string[]
): Promise<T> {
  if (!_key) return obj;
  const result = { ...obj };
  for (const field of fields) {
    const val = result[field];
    if (typeof val === 'string') {
      try {
        (result as Record<string, unknown>)[field] = await decryptField(val);
      } catch {
        // Value may already be plaintext (stored before key was available)
        // Leave as-is
      }
    }
  }
  return result;
}
