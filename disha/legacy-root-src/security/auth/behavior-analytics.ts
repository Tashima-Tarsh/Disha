/**
 * Behavior Analytics
 *
 * Tracks per-user request patterns and emits anomaly signals when behavior
 * deviates significantly from the established baseline.
 *
 * This module focuses entirely on defensive detection (protecting the user's
 * own account). No cross-user surveillance or data-sharing occurs.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type AnomalyKind =
	| "unusual_hour" // request outside normal active hours
	| "rapid_requests" // request rate spike
	| "new_ip_prefix" // never-seen-before IP prefix
	| "new_user_agent" // never-seen-before user-agent
	| "geo_velocity" // impossible travel speed between requests

export interface AnomalyEvent {
	kind: AnomalyKind
	userId: string
	detail: string
	detectedAt: number
	severity: "low" | "medium" | "high"
}

export interface UserProfile {
	userId: string
	/** Hour-of-day (0–23) → request count */
	hourCounts: number[]
	/** Known IP prefixes */
	knownIpPrefixes: Set<string>
	/** Known user-agent strings (hashed) */
	knownUserAgents: Set<string>
	totalRequests: number
	lastSeenAt: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RAPID_REQUEST_WINDOW_MS = 60_000 // 1 minute
const RAPID_REQUEST_THRESHOLD = 120 // > 120 req/min is suspicious
const PROFILE_LEARNING_REQUESTS = 50 // trust after N requests

// ── BehaviorAnalytics ─────────────────────────────────────────────────────────

export class BehaviorAnalytics {
	private readonly profiles = new Map<string, UserProfile>()
	/** userId → timestamps of recent requests */
	private readonly recentRequests = new Map<string, number[]>()
	private readonly anomalyHandlers: Array<(event: AnomalyEvent) => void> = []

	/** Register a callback to receive anomaly events. */
	onAnomaly(handler: (event: AnomalyEvent) => void): void {
		this.anomalyHandlers.push(handler)
	}

	/**
	 * Record a request and return any detected anomalies.
	 */
	record(opts: {
		userId: string
		ipPrefix: string
		userAgent: string
		timestampMs?: number
	}): AnomalyEvent[] {
		const now = opts.timestampMs ?? Date.now()
		const anomalies: AnomalyEvent[] = []

		const profile = this.getOrCreate(opts.userId)
		const hour = new Date(now).getUTCHours()

		// --- Rate spike ---
		const recent = this.trackRequest(opts.userId, now)
		if (recent > RAPID_REQUEST_THRESHOLD) {
			anomalies.push(this.emit({
				kind: "rapid_requests",
				userId: opts.userId,
				detail: `${recent} requests in the last minute`,
				detectedAt: now,
				severity: "high",
			}))
		}

		if (profile.totalRequests >= PROFILE_LEARNING_REQUESTS) {
			// --- Unusual hour ---
			if ((profile.hourCounts[hour] ?? 0) === 0) {
				anomalies.push(this.emit({
					kind: "unusual_hour",
					userId: opts.userId,
					detail: `Request at hour ${hour} UTC (never seen before)`,
					detectedAt: now,
					severity: "low",
				}))
			}

			// --- New IP prefix ---
			if (!profile.knownIpPrefixes.has(opts.ipPrefix)) {
				anomalies.push(this.emit({
					kind: "new_ip_prefix",
					userId: opts.userId,
					detail: `Unseen IP prefix: ${opts.ipPrefix}`,
					detectedAt: now,
					severity: "medium",
				}))
			}

			// --- New user-agent ---
			const uaKey = opts.userAgent.slice(0, 80)
			if (!profile.knownUserAgents.has(uaKey)) {
				anomalies.push(this.emit({
					kind: "new_user_agent",
					userId: opts.userId,
					detail: `Unseen user-agent: ${uaKey}`,
					detectedAt: now,
					severity: "low",
				}))
			}
		}

		// --- Update profile ---
		profile.hourCounts[hour] = (profile.hourCounts[hour] ?? 0) + 1
		profile.knownIpPrefixes.add(opts.ipPrefix)
		profile.knownUserAgents.add(opts.userAgent.slice(0, 80))
		profile.totalRequests++
		profile.lastSeenAt = now

		return anomalies
	}

	/** Return the current profile for a user, or undefined if unseen. */
	getProfile(userId: string): UserProfile | undefined {
		return this.profiles.get(userId)
	}

	/** Remove all data for a user (right-to-erasure / account deletion). */
	eraseUser(userId: string): void {
		this.profiles.delete(userId)
		this.recentRequests.delete(userId)
	}

	// ── Internals ─────────────────────────────────────────────────────────────────

	private getOrCreate(userId: string): UserProfile {
		let p = this.profiles.get(userId)
		if (!p) {
			p = {
				userId,
				hourCounts: Array.from({ length: 24 }, () => 0),
				knownIpPrefixes: new Set(),
				knownUserAgents: new Set(),
				totalRequests: 0,
				lastSeenAt: Date.now(),
			}
			this.profiles.set(userId, p)
		}
		return p
	}

	private trackRequest(userId: string, now: number): number {
		const cutoff = now - RAPID_REQUEST_WINDOW_MS
		const times = (this.recentRequests.get(userId) ?? []).filter((t) => t > cutoff)
		times.push(now)
		this.recentRequests.set(userId, times)
		return times.length
	}

	private emit(event: AnomalyEvent): AnomalyEvent {
		for (const h of this.anomalyHandlers) {
			try {
				h(event)
			} catch {
				// handlers must not crash the caller
			}
		}
		return event
	}
}
