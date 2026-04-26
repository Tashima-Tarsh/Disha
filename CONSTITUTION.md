# Go4Bid Constitution

This document defines the architectural and ethical governance of the Go4Bid project.

## 1. Privacy & Storage
*   **No Persistent DB**: All data storage must be ephemeral. Upstash Redis is the primary store.
*   **No SQL/NoSQL**: Persistent disks are prohibited for production data storage.
*   **Ephemeral Only**: Memory-first architecture.
*   **30-Minute Wipe**: All session and transaction data must be purged every 30 minutes (Rule 5).

## 2. Data Governance
*   **Argon2id Mandatory**: All Personally Identifiable Information (PII) and credentials MUST be hashed using **Argon2id** (Rule 2). SHA-256 is only permitted for non-sensitive public identifiers.
*   **User Consent**: Any task involving user data must be halted and reviewed for alternative ephemeral methods (Rule 3).

## 3. Security (The Honeypot)
*   **Honey-API**: All external-facing endpoints must be shadowed by a Honey-API layer.
*   **Cloudflare Tarpit**: Suspicious or aggressive traffic must be "Tarpitted" (delayed) via Edge Workers (Rule 6).

## 4. Bidding Logic
*   **L1 Priority**: The system must prioritize matching the L1 (Lowest technically qualified) bidder (Rule 4).
*   **Backups**: Maintain L2 and L3 fallback paths for all automated matching.

---
*Updated: April 22, 2026 (Refined for 48-Hour Workflow)*
