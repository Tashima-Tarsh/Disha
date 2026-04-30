import { hashArgon2 } from '../utils/security';

/**
 * Task 1: The Blind Authenticator
 * Serverless function that takes a WhatsApp ID or Society Code
 * and generates a one-way deterministic hash (Blind ID).
 */

export interface BlindAuthResponse {
  blindId: string;
  status: 'authenticated' | 'failed';
}

/**
 * Generates a Blind ID from a WhatsApp ID or Society Code.
 * Rule: This is the ONLY identifier allowed in memory.
 */
export async function authenticateBlind(identifier: string): Promise<BlindAuthResponse> {
  try {
    // Generate deterministic hash using Argon2id
    // We use a platform-wide static salt for determinism across nodes
    const STATIC_SOVEREIGN_SALT = 'sovereign-node-2026-v1';
    
    const blindId = await hashArgon2(identifier, STATIC_SOVEREIGN_SALT);
    
    console.log(`[AUTH] Blind ID generated: ${blindId.substring(0, 10)}...`);
    
    return {
      blindId,
      status: 'authenticated'
    };
  } catch (err) {
    console.error('[AUTH] Authentication failed', err);
    return {
      blindId: '',
      status: 'failed'
    };
  }
}
