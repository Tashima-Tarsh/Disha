/**
 * Multi-Factor Authentication (MFA)
 *
 * Supports TOTP (RFC 6238), backup codes, and extensible second-factor
 * providers. Hardware-key (FIDO2/WebAuthn) and biometric flows are surfaced
 * as strategy interfaces so external libraries can be plugged in without
 * changing this module.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

// ── TOTP (RFC 6238) ───────────────────────────────────────────────────────────

const TOTP_DIGITS = 6
const TOTP_WINDOW = 1 // ±1 step = ±30 s clock-skew tolerance
const TOTP_STEP_SECONDS = 30

/** Base32 alphabet used by Google Authenticator and most TOTP apps. */
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function base32Decode(input: string): Buffer {
	const cleaned = input.toUpperCase().replace(/=+$/, "")
	const bits: number[] = []
	for (const ch of cleaned) {
		const val = BASE32_CHARS.indexOf(ch)
		if (val === -1) throw new Error(`Invalid base32 character: ${ch}`)
		bits.push((val >> 4) & 1, (val >> 3) & 1, (val >> 2) & 1, (val >> 1) & 1, val & 1)
	}
	// Pad to byte boundary
	while (bits.length % 8 !== 0) bits.push(0)
	const bytes: number[] = []
	for (let i = 0; i < bits.length; i += 8) {
		bytes.push(
			(bits[i]! << 7) |
				(bits[i + 1]! << 6) |
				(bits[i + 2]! << 5) |
				(bits[i + 3]! << 4) |
				(bits[i + 4]! << 3) |
				(bits[i + 5]! << 2) |
				(bits[i + 6]! << 1) |
				bits[i + 7]!,
		)
	}
	return Buffer.from(bytes)
}

function base32Encode(buf: Buffer): string {
	let bits = ""
	for (const byte of buf) {
		bits += byte.toString(2).padStart(8, "0")
	}
	// Pad to 5-bit boundary
	while (bits.length % 5 !== 0) bits += "0"
	let result = ""
	for (let i = 0; i < bits.length; i += 5) {
		result += BASE32_CHARS[parseInt(bits.slice(i, i + 5), 2)]
	}
	return result
}

function totpCounter(timestampMs = Date.now()): number {
	return Math.floor(timestampMs / 1000 / TOTP_STEP_SECONDS)
}

function hotpCode(secretBase32: string, counter: number): string {
	const secret = base32Decode(secretBase32)
	const counterBuf = Buffer.allocUnsafe(8)
	// Write 64-bit big-endian counter
	counterBuf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0)
	counterBuf.writeUInt32BE(counter >>> 0, 4)
	const hmac = createHmac("sha1", secret).update(counterBuf).digest()
	const offset = hmac[19]! & 0x0f
	const code =
		(((hmac[offset]! & 0x7f) << 24) |
			((hmac[offset + 1]! & 0xff) << 16) |
			((hmac[offset + 2]! & 0xff) << 8) |
			(hmac[offset + 3]! & 0xff)) %
		10 ** TOTP_DIGITS
	return code.toString().padStart(TOTP_DIGITS, "0")
}

/** Generate a new random TOTP secret (base32). */
export function generateTotpSecret(): string {
	return base32Encode(randomBytes(20))
}

/**
 * Verify a TOTP token.
 * Accepts codes within ±TOTP_WINDOW steps to handle clock skew.
 */
export function verifyTotp(secretBase32: string, token: string, timestampMs = Date.now()): boolean {
	const counter = totpCounter(timestampMs)
	for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta++) {
		const expected = hotpCode(secretBase32, counter + delta)
		const expectedBuf = Buffer.from(expected)
		const givenBuf = Buffer.from(token.padStart(TOTP_DIGITS, "0"))
		if (
			expectedBuf.length === givenBuf.length &&
			timingSafeEqual(expectedBuf, givenBuf)
		) {
			return true
		}
	}
	return false
}

/** Build an otpauth:// URI for QR-code enrollment. */
export function buildTotpUri(secret: string, account: string, issuer: string): string {
	const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(TOTP_DIGITS), period: String(TOTP_STEP_SECONDS) })
	return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?${params}`
}

// ── Backup codes ──────────────────────────────────────────────────────────────

const BACKUP_CODE_LENGTH = 10
const BACKUP_CODE_COUNT = 10

/** Generate a set of one-time backup codes. Returns plaintext codes + bcrypt-like digests. */
export function generateBackupCodes(): { codes: string[]; hashes: string[] } {
	const codes: string[] = []
	const hashes: string[] = []
	for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
		const code = randomBytes(BACKUP_CODE_LENGTH / 2)
			.toString("hex")
			.toUpperCase()
			.slice(0, BACKUP_CODE_LENGTH)
		codes.push(code)
		// Store HMAC-SHA256 of the code (salt = first 8 chars of code)
		const salt = code.slice(0, 8)
		const hash = createHmac("sha256", salt).update(code).digest("hex")
		hashes.push(`${salt}:${hash}`)
	}
	return { codes, hashes }
}

/** Verify a backup code against stored hashes; returns the matching hash index or -1. */
export function verifyBackupCode(code: string, hashes: string[]): number {
	const normalised = code.replace(/\s/g, "").toUpperCase()
	for (let i = 0; i < hashes.length; i++) {
		const hash = hashes[i]
		if (!hash) continue
		const colonIdx = hash.indexOf(":")
		if (colonIdx === -1) continue
		const salt = hash.slice(0, colonIdx)
		const stored = hash.slice(colonIdx + 1)
		const expected = createHmac("sha256", salt).update(normalised).digest("hex")
		const expectedBuf = Buffer.from(expected, "hex")
		const storedBuf = Buffer.from(stored, "hex")
		if (expectedBuf.length === storedBuf.length && timingSafeEqual(expectedBuf, storedBuf)) {
			return i
		}
	}
	return -1
}

// ── MFA state & orchestration ─────────────────────────────────────────────────

export type MFAMethod = "totp" | "backup_code" | "hardware_key" | "biometric"

export interface MFAConfig {
	enabled: boolean
	methods: MFAMethod[]
	totpSecret?: string
	backupCodeHashes?: string[]
}

export interface MFAChallengeResult {
	success: boolean
	method: MFAMethod
	/** If a backup code was used, the index to mark as consumed. */
	consumedBackupCodeIndex?: number
}

/**
 * Evaluate a second-factor challenge.
 *
 * For hardware-key and biometric methods the caller must supply a
 * pre-validated boolean (`externalVerified`).
 */
export function evaluateMFAChallenge(
	config: MFAConfig,
	method: MFAMethod,
	credential: string,
	externalVerified = false,
): MFAChallengeResult {
	if (!config.enabled) {
		return { success: true, method }
	}
	if (!config.methods.includes(method)) {
		return { success: false, method }
	}

	switch (method) {
		case "totp": {
			if (!config.totpSecret) return { success: false, method }
			return { success: verifyTotp(config.totpSecret, credential), method }
		}
		case "backup_code": {
			if (!config.backupCodeHashes?.length) return { success: false, method }
			const idx = verifyBackupCode(credential, config.backupCodeHashes)
			return { success: idx !== -1, method, consumedBackupCodeIndex: idx !== -1 ? idx : undefined }
		}
		case "hardware_key":
		case "biometric": {
			// Delegated to an external FIDO2/biometric verifier
			return { success: externalVerified, method }
		}
		default:
			return { success: false, method }
	}
}
