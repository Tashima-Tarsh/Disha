/**
 * Device Fingerprinting
 *
 * Produces a stable, privacy-preserving identifier for a client device based
 * on observable HTTP signals. The fingerprint is a one-way HMAC so the raw
 * signals are never stored.
 */

import { createHmac } from "node:crypto"
import type { IncomingMessage } from "node:http"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FingerprintComponents {
	userAgent: string
	acceptLanguage: string
	acceptEncoding: string
	/** Coarse IP prefix (first two octets only – avoids exact IP storage). */
	ipPrefix: string
	/** Optional: TLS cipher suite reported by the server. */
	tlsCipher?: string
}

export interface FingerprintResult {
	fingerprint: string
	components: FingerprintComponents
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractIpPrefix(req: IncomingMessage): string {
	const raw =
		(req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
		req.socket?.remoteAddress ??
		"unknown"
	// IPv4: keep first two octets.  IPv6: keep first two groups.
	if (raw.includes(":")) {
		return raw.split(":").slice(0, 2).join(":")
	}
	return raw.split(".").slice(0, 2).join(".")
}

// ── DeviceFingerprinter ────────────────────────────────────────────────────────

/**
 * Generates device fingerprints from HTTP request headers.
 *
 * The fingerprint is an HMAC-SHA256 keyed with a server secret so two
 * different deployments produce different fingerprints for the same device.
 */
export class DeviceFingerprinter {
	private readonly key: Buffer

	constructor(secret: string) {
		this.key = createHmac("sha256", secret).update("device-fingerprint-v1").digest()
	}

	fromRequest(req: IncomingMessage): FingerprintResult {
		const components: FingerprintComponents = {
			userAgent: req.headers["user-agent"] ?? "",
			acceptLanguage: req.headers["accept-language"] ?? "",
			acceptEncoding: req.headers["accept-encoding"] ?? "",
			ipPrefix: extractIpPrefix(req),
		}
		return { fingerprint: this.compute(components), components }
	}

	fromComponents(components: FingerprintComponents): FingerprintResult {
		return { fingerprint: this.compute(components), components }
	}

	/** True when the two fingerprints are close-enough to the same device. */
	matches(a: string, b: string): boolean {
		if (a.length !== b.length) return false
		const aBuf = Buffer.from(a, "hex")
		const bBuf = Buffer.from(b, "hex")
		let diff = 0
		for (let i = 0; i < aBuf.length; i++) diff |= (aBuf[i] ?? 0) ^ (bBuf[i] ?? 0)
		return diff === 0
	}

	// ── Internals ─────────────────────────────────────────────────────────────────

	private compute(c: FingerprintComponents): string {
		const canonical = [
			c.userAgent,
			c.acceptLanguage,
			c.acceptEncoding,
			c.ipPrefix,
			c.tlsCipher ?? "",
		].join("|")
		return createHmac("sha256", this.key).update(canonical).digest("hex")
	}
}
