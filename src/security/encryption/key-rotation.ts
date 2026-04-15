/**
 * Key Rotation Manager
 *
 * Schedules automatic cryptographic key rotation and provides hooks for
 * notifying dependent services when a new key becomes active.
 */

import { randomBytes } from "node:crypto"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KeyRecord {
	id: string
	material: Buffer
	createdAt: number
	expiresAt: number
	status: "active" | "retired" | "revoked"
}

export type RotationHandler = (newKey: KeyRecord, previousKey: KeyRecord | undefined) => void | Promise<void>

// ── KeyRotationManager ────────────────────────────────────────────────────────

/**
 * Manages a named set of cryptographic keys and rotates them on a schedule.
 *
 * Old keys are retained in "retired" status so that data encrypted/signed
 * under them can still be decrypted until explicitly revoked.
 */
export class KeyRotationManager {
	private readonly keys = new Map<string, KeyRecord>()
	private activeKeyId: string | undefined
	private readonly rotationHandlers: RotationHandler[] = []
	private rotationTimer: ReturnType<typeof setTimeout> | undefined

	constructor(
		private readonly keyBytes = 32,
		private readonly rotationIntervalMs = 7 * 24 * 60 * 60 * 1000, // weekly
	) {}

	// ── Key lifecycle ─────────────────────────────────────────────────────────────

	/** Generate and activate a new key. Returns the new KeyRecord. */
	rotate(): KeyRecord {
		const previous = this.activeKeyId ? this.keys.get(this.activeKeyId) : undefined

		if (previous) {
			previous.status = "retired"
		}

		const newKey: KeyRecord = {
			id: randomBytes(8).toString("hex"),
			material: randomBytes(this.keyBytes),
			createdAt: Date.now(),
			expiresAt: Date.now() + this.rotationIntervalMs,
			status: "active",
		}
		this.keys.set(newKey.id, newKey)
		this.activeKeyId = newKey.id

		// Notify handlers
		for (const h of this.rotationHandlers) {
			Promise.resolve(h(newKey, previous)).catch(() => {})
		}

		return newKey
	}

	/** Return the currently active key. Creates one if none exists. */
	getActiveKey(): KeyRecord {
		const key = this.activeKeyId ? this.keys.get(this.activeKeyId) : undefined
		if (!key || key.status !== "active") return this.rotate()
		return key
	}

	/** Return any key by ID (including retired). */
	getKey(id: string): KeyRecord | undefined {
		return this.keys.get(id)
	}

	/** List all keys with their status. */
	listKeys(): KeyRecord[] {
		return [...this.keys.values()]
	}

	/** Revoke a key immediately (retired data will no longer be decryptable). */
	revokeKey(id: string): boolean {
		const key = this.keys.get(id)
		if (!key) return false
		key.status = "revoked"
		return true
	}

	// ── Scheduling ────────────────────────────────────────────────────────────────

	/** Register a callback invoked on every rotation. */
	onRotation(handler: RotationHandler): void {
		this.rotationHandlers.push(handler)
	}

	/** Start automatic rotation on a fixed interval. */
	startAutoRotation(): void {
		this.stopAutoRotation()
		this.rotationTimer = setInterval(() => this.rotate(), this.rotationIntervalMs)
		this.rotationTimer.unref?.()
	}

	stopAutoRotation(): void {
		if (this.rotationTimer) {
			clearInterval(this.rotationTimer)
			this.rotationTimer = undefined
		}
	}
}
