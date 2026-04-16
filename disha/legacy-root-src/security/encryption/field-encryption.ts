/**
 * Field-Level Encryption
 *
 * AES-256-GCM encryption/decryption for individual database fields or
 * arbitrary string values. Each value gets a unique random IV so the same
 * plaintext always produces a different ciphertext.
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto"

// ── Constants ─────────────────────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12 // 96-bit IV recommended for GCM
const TAG_BYTES = 16
const KEY_BYTES = 32 // AES-256

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EncryptedValue {
	/** Base64url-encoded payload: IV (12) | auth-tag (16) | ciphertext */
	ciphertext: string
	/** Key identifier – lets callers rotate keys without re-encrypting all data at once. */
	keyId: string
}

// ── FieldEncryption ────────────────────────────────────────────────────────────

/**
 * Encrypts and decrypts individual values using AES-256-GCM.
 *
 * Keys are derived from a master secret using HMAC-SHA256 so that adding
 * new key IDs is cheap (no HSM round-trip required in development).
 */
export class FieldEncryption {
	private readonly keys = new Map<string, Buffer>()
	private activeKeyId: string

	constructor(masterSecret: string, initialKeyId = "k1") {
		this.activeKeyId = initialKeyId
		this.addKey(masterSecret, initialKeyId)
	}

	/** Derive and register a new key ID. Call during key rotation. */
	addKey(masterSecret: string, keyId: string): void {
		const key = createHmac("sha256", masterSecret)
			.update(`field-encryption:${keyId}`)
			.digest()
		if (key.length !== KEY_BYTES) throw new Error("Derived key has unexpected length")
		this.keys.set(keyId, key)
	}

	/** Switch to a different active key ID for new encryptions. */
	setActiveKey(keyId: string): void {
		if (!this.keys.has(keyId)) throw new Error(`Unknown keyId: ${keyId}`)
		this.activeKeyId = keyId
	}

	get currentKeyId(): string {
		return this.activeKeyId
	}

	// ── Core operations ───────────────────────────────────────────────────────────

	encrypt(plaintext: string): EncryptedValue {
		const key = this.keys.get(this.activeKeyId)
		if (!key) throw new Error(`No key for keyId: ${this.activeKeyId}`)

		const iv = randomBytes(IV_BYTES)
		const cipher = createCipheriv(ALGORITHM, key, iv)
		const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
		const tag = cipher.getAuthTag()

		// Layout: iv(12) | tag(16) | ciphertext
		const payload = Buffer.concat([iv, tag, encrypted])
		return { ciphertext: payload.toString("base64url"), keyId: this.activeKeyId }
	}

	decrypt(value: EncryptedValue): string {
		const key = this.keys.get(value.keyId)
		if (!key) throw new Error(`Unknown keyId for decryption: ${value.keyId}`)

		const buf = Buffer.from(value.ciphertext, "base64url")
		if (buf.length < IV_BYTES + TAG_BYTES) throw new Error("Ciphertext too short")

		const iv = buf.subarray(0, IV_BYTES)
		const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
		const ciphertext = buf.subarray(IV_BYTES + TAG_BYTES)

		const decipher = createDecipheriv(ALGORITHM, key, iv)
		decipher.setAuthTag(tag)
		return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8")
	}

	// ── Re-encryption (key rotation) ──────────────────────────────────────────────

	/**
	 * Re-encrypt a value under the current active key.
	 * Use this to migrate records during a scheduled key rotation.
	 */
	reencrypt(value: EncryptedValue): EncryptedValue {
		if (value.keyId === this.activeKeyId) return value
		const plaintext = this.decrypt(value)
		return this.encrypt(plaintext)
	}
}
