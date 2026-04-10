/**
 * JWT Token Manager
 *
 * Issues and validates RS256-signed JWT access tokens and opaque refresh
 * tokens. Supports automatic rotation and token revocation.
 */

import { createSign, createVerify, generateKeyPairSync, randomBytes } from "node:crypto"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TokenPayload {
	sub: string // subject (userId)
	iat: number // issued-at (seconds)
	exp: number // expiry (seconds)
	jti: string // unique token id
	roles?: string[]
	[claim: string]: unknown
}

export interface IssuedTokens {
	accessToken: string
	refreshToken: string
	expiresIn: number // seconds
}

export interface TokenValidationResult {
	valid: boolean
	payload?: TokenPayload
	reason?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60 // 15 min
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const ALGORITHM = "RS256"

// ── Helpers ───────────────────────────────────────────────────────────────────

function base64url(input: Buffer | string): string {
	const buf = typeof input === "string" ? Buffer.from(input) : input
	return buf.toString("base64url")
}

function encodeJwtPart(obj: unknown): string {
	return base64url(Buffer.from(JSON.stringify(obj)))
}

// ── TokenManager ──────────────────────────────────────────────────────────────

export class TokenManager {
	private privateKey: string
	private publicKey: string
	/** Revoked JTIs → expiry epoch (ms) */
	private readonly revoked = new Map<string, number>()
	/** opaque refresh-token → { userId, expiresAt } */
	private readonly refreshTokens = new Map<string, { userId: string; expiresAt: number; roles?: string[] }>()

	constructor(privateKeyPem?: string, publicKeyPem?: string) {
		if (privateKeyPem && publicKeyPem) {
			this.privateKey = privateKeyPem
			this.publicKey = publicKeyPem
		} else {
			const { privateKey, publicKey } = generateKeyPairSync("rsa", {
				modulusLength: 2048,
				publicKeyEncoding: { type: "spki", format: "pem" },
				privateKeyEncoding: { type: "pkcs8", format: "pem" },
			})
			this.privateKey = privateKey
			this.publicKey = publicKey
		}
		// Periodically prune expired revocations
		setInterval(() => this.pruneRevoked(), 10 * 60 * 1000).unref()
	}

	// ── Issuance ────────────────────────────────────────────────────────────────

	issue(userId: string, extraClaims: Record<string, unknown> = {}): IssuedTokens {
		const now = Math.floor(Date.now() / 1000)
		const payload: TokenPayload = {
			sub: userId,
			iat: now,
			exp: now + ACCESS_TOKEN_TTL_SECONDS,
			jti: randomBytes(16).toString("base64url"),
			...extraClaims,
		}

		const header = encodeJwtPart({ alg: ALGORITHM, typ: "JWT" })
		const body = encodeJwtPart(payload)
		const unsigned = `${header}.${body}`

		const signer = createSign("RSA-SHA256")
		signer.update(unsigned)
		const sig = signer.sign(this.privateKey, "base64url")
		const accessToken = `${unsigned}.${sig}`

		const refreshToken = randomBytes(32).toString("base64url")
		this.refreshTokens.set(refreshToken, {
			userId,
			expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
			roles: extraClaims.roles as string[] | undefined,
		})

		return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS }
	}

	// ── Validation ──────────────────────────────────────────────────────────────

	validate(token: string): TokenValidationResult {
		const parts = token.split(".")
		if (parts.length !== 3) return { valid: false, reason: "malformed" }

		const [headerB64, bodyB64, sigB64] = parts
		const unsigned = `${headerB64}.${bodyB64}`

		try {
			const verifier = createVerify("RSA-SHA256")
			verifier.update(unsigned)
			const ok = verifier.verify(this.publicKey, sigB64!, "base64url")
			if (!ok) return { valid: false, reason: "bad_signature" }
		} catch {
			return { valid: false, reason: "verify_error" }
		}

		let payload: TokenPayload
		try {
			payload = JSON.parse(Buffer.from(bodyB64!, "base64url").toString()) as TokenPayload
		} catch {
			return { valid: false, reason: "bad_payload" }
		}

		if (Date.now() / 1000 > payload.exp) {
			return { valid: false, reason: "expired" }
		}

		if (this.revoked.has(payload.jti)) {
			return { valid: false, reason: "revoked" }
		}

		return { valid: true, payload }
	}

	// ── Rotation ─────────────────────────────────────────────────────────────────

	/** Exchange a valid refresh token for a new access+refresh token pair. */
	refresh(refreshToken: string, extraClaims?: Record<string, unknown>): IssuedTokens | null {
		const entry = this.refreshTokens.get(refreshToken)
		if (!entry || Date.now() > entry.expiresAt) {
			this.refreshTokens.delete(refreshToken)
			return null
		}
		this.refreshTokens.delete(refreshToken) // one-time use
		return this.issue(entry.userId, { roles: entry.roles, ...extraClaims })
	}

	// ── Revocation ───────────────────────────────────────────────────────────────

	/** Immediately revoke an access token by its JTI. */
	revoke(token: string): boolean {
		const result = this.validate(token)
		if (!result.valid || !result.payload) return false
		this.revoked.set(result.payload.jti, result.payload.exp * 1000)
		return true
	}

	/** Revoke a refresh token. */
	revokeRefreshToken(refreshToken: string): boolean {
		return this.refreshTokens.delete(refreshToken)
	}

	/** Return the RSA public key in PEM format (for sharing with resource servers). */
	getPublicKey(): string {
		return this.publicKey
	}

	// ── Internals ─────────────────────────────────────────────────────────────────

	private pruneRevoked(): void {
		const now = Date.now()
		for (const [jti, expiryMs] of this.revoked) {
			if (now > expiryMs) this.revoked.delete(jti)
		}
		for (const [rt, entry] of this.refreshTokens) {
			if (now > entry.expiresAt) this.refreshTokens.delete(rt)
		}
	}
}
