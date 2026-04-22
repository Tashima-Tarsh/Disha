/**
 * Go4Bid Privacy Utilities
 * Rule 2: Every PII must be hashed before storage.
 */

/**
 * Hashes Personally Identifiable Information using SHA-256.
 * Note: For browser environments, we use the Web Crypto API.
 */
export async function hashPII(data: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Sanitizes a user object by hashing PII fields.
 */
export async function sanitizeUser(user: { name?: string; email?: string; [key: string]: any }) {
  const sanitized = { ...user };
  if (user.name) sanitized.name = await hashPII(user.name);
  if (user.email) sanitized.email = await hashPII(user.email);
  return sanitized;
}
