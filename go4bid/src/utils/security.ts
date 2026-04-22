// @ts-ignore
import argon2 from 'argon2-browser/dist/argon2-bundled.min.js';

/**
 * Go4Bid Security Utilities
 */

/**
 * Hashes a string using Argon2id.
 * This is "memory-hard" and secure against GPU cracking.
 */
export async function hashArgon2(data: string, salt: string = 'static-salt-for-demo'): Promise<string> {
  try {
    const result = await argon2.hash({
      pass: data,
      salt: salt,
      time: 2, // Iterations
      mem: 2048, // Memory (KiB)
      hashLen: 32,
      parallelism: 1,
      type: argon2.ArgonType.Argon2id,
    });
    
    return result.encoded;
  } catch (err) {
    console.error('Argon2 Hashing Failed:', err);
    throw new Error('Encryption Failure');
  }
}

/**
 * Verifies a string against an Argon2id hash.
 */
export async function verifyArgon2(data: string, encoded: string): Promise<boolean> {
  try {
    await argon2.verify({
      pass: data,
      encoded: encoded,
    });
    return true;
  } catch (err) {
    return false;
  }
}
