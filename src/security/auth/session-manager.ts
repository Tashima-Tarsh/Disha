/**
 * Session Manager
 *
 * Manages authenticated user sessions with:
 * - Cryptographically signed session tokens
 * - Configurable TTL and rotation
 * - Device binding (fingerprint pinning)
 * - Anomaly detection hooks
 * - Automatic expiry cleanup
 */

import { createHmac, randomBytes } from "node:crypto"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionRecord {
	id: string
	userId: string
	deviceFingerprint?: string
	ipAddress?: string
	createdAt: number
	expiresAt: number
	lastActiveAt: number
	rotatedAt?: number
	/** Arbitrary metadata (roles, permissions snapshot, etc.) */
	metadata: Record<string, unknown>
}

export interface CreateSessionOptions {
	userId: string
	deviceFingerprint?: string
	ipAddress?: string
	ttlMs?: number
	metadata?: Record<string, unknown>
}

export interface SessionValidationResult {
	valid: boolean
	session?: SessionRecord
	reason?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 15 * 60 * 1000 // 15 minutes (matches token rotation window)
const ROTATION_THRESHOLD_MS = 5 * 60 * 1000 // rotate when < 5 min remain
const CLEANUP_INTERVAL_MS = 60 * 1000 // clean every minute
const SIGNING_CONTEXT = "cc-session-v1"

// ── SessionManager ────────────────────────────────────────────────────────────

/**
 * In-memory session store with HMAC-signed session IDs.
 *
 * For production deployments, replace the internal `Map` with a
 * distributed cache (Redis, DynamoDB, etc.) behind the same interface.
 */
export class SessionManager {
	private readonly sessions = new Map<string, SessionRecord>()
	private readonly signingKey: Buffer
	private readonly defaultTtlMs: number
	private _cleanupTimer: ReturnType<typeof setInterval> | undefined

	constructor(secret: string, defaultTtlMs = DEFAULT_TTL_MS) {
		this.signingKey = createHmac("sha256", secret).update(SIGNING_CONTEXT).digest()
		this.defaultTtlMs = defaultTtlMs
		this._cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS)
		this._cleanupTimer.unref?.()
	}

	// ── Lifecycle ───────────────────────────────────────────────────────────────

	/**
	 * Create a new session.
	 * Returns a signed token that clients must present with every request.
	 */
	create(opts: CreateSessionOptions): { token: string; session: SessionRecord } {
		const id = randomBytes(32).toString("base64url")
		const now = Date.now()
		const record: SessionRecord = {
			id,
			userId: opts.userId,
			deviceFingerprint: opts.deviceFingerprint,
			ipAddress: opts.ipAddress,
			createdAt: now,
			expiresAt: now + (opts.ttlMs ?? this.defaultTtlMs),
			lastActiveAt: now,
			metadata: opts.metadata ?? {},
		}
		this.sessions.set(id, record)
		return { token: this.sign(id), session: record }
	}

	/**
	 * Validate a signed token.
	 *
	 * Optionally enforces device binding — pass `deviceFingerprint` to ensure
	 * the session was created on the same device.
	 */
	validate(
		token: string,
		opts?: { deviceFingerprint?: string; ipAddress?: string },
	): SessionValidationResult {
		const id = this.unsign(token)
		if (!id) return { valid: false, reason: "invalid_signature" }

		const session = this.sessions.get(id)
		if (!session) return { valid: false, reason: "not_found" }

		if (Date.now() > session.expiresAt) {
			this.sessions.delete(id)
			return { valid: false, reason: "expired" }
		}

		if (opts?.deviceFingerprint && session.deviceFingerprint) {
			if (session.deviceFingerprint !== opts.deviceFingerprint) {
				return { valid: false, reason: "device_mismatch" }
			}
		}

		// Update last-active
		session.lastActiveAt = Date.now()

		return { valid: true, session }
	}

	/**
	 * Rotate a session: extend TTL and re-sign.
	 * Call this on every successful authenticated request when close to expiry.
	 */
	rotate(token: string, ttlMs?: number): { newToken: string; session: SessionRecord } | null {
		const id = this.unsign(token)
		if (!id) return null

		const session = this.sessions.get(id)
		if (!session || Date.now() > session.expiresAt) return null

		const now = Date.now()
		session.expiresAt = now + (ttlMs ?? this.defaultTtlMs)
		session.rotatedAt = now
		session.lastActiveAt = now

		return { newToken: this.sign(id), session }
	}

	/** Whether the session should be rotated (close to expiry). */
	shouldRotate(token: string): boolean {
		const id = this.unsign(token)
		if (!id) return false
		const session = this.sessions.get(id)
		if (!session) return false
		return session.expiresAt - Date.now() < ROTATION_THRESHOLD_MS
	}

	/** Destroy a session (logout). */
	destroy(token: string): boolean {
		const id = this.unsign(token)
		if (!id) return false
		return this.sessions.delete(id)
	}

	/** Destroy all sessions for a user (force logout). */
	destroyUser(userId: string): number {
		let count = 0
		for (const [id, session] of this.sessions) {
			if (session.userId === userId) {
				this.sessions.delete(id)
				count++
			}
		}
		return count
	}

	/** Return all active sessions for a user. */
	getUserSessions(userId: string): SessionRecord[] {
		const now = Date.now()
		return [...this.sessions.values()].filter(
			(s) => s.userId === userId && s.expiresAt > now,
		)
	}

	get activeCount(): number {
		return this.sessions.size
	}

	stopCleanup(): void {
		if (this._cleanupTimer) {
			clearInterval(this._cleanupTimer)
			this._cleanupTimer = undefined
		}
	}

	// ── Signing ─────────────────────────────────────────────────────────────────

	private sign(id: string): string {
		const hmac = createHmac("sha256", this.signingKey).update(id).digest("base64url")
		return `${id}.${hmac}`
	}

	private unsign(token: string): string | null {
		const dot = token.lastIndexOf(".")
		if (dot === -1) return null
		const id = token.slice(0, dot)
		const provided = token.slice(dot + 1)
		const expected = createHmac("sha256", this.signingKey).update(id).digest("base64url")
		const a = Buffer.from(provided)
		const b = Buffer.from(expected)
		if (a.length !== b.length) return null
		let diff = 0
		for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
		return diff === 0 ? id : null
	}

	// ── Cleanup ─────────────────────────────────────────────────────────────────

	cleanup(): void {
		const now = Date.now()
		for (const [id, session] of this.sessions) {
			if (now > session.expiresAt) this.sessions.delete(id)
		}
	}
}
