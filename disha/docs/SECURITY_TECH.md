# Security & Governance

Security is not a feature in DISHA; it is the **Sovereign Foundation**. The platform operates on a Zero-Trust, self-healing architecture designed for high-adversity environments.

## 🛡️ Sentinel Protection Layer

The **Sentinel Shield** is an autonomous security layer that operates independently of the main reasoning loop.

### 1. Proactive Monitoring
Sentinel ingests real-time security signals from:
- **Local Logs**: System-level audit trails and service health pulses.
- **Global OSINT**: Feeds for new CVEs, malicious IPs, and leaked credentials.
- **Network Telemetry**: Analysis of incoming traffic patterns for anomaly detection.

### 2. Autonomous Response
When a threat is detected, Sentinel can trigger:
- **Isolation**: Quarantining infected services or nodes.
- **Credential Revocation**: Automatically invalidating compromised JWT tokens.
- **Rollback**: Returning infrastructure to the last known "Green" state.

---

## 🔒 Governance (Project NYAYA)

Project NYAYA is DISHA's internal judicial intelligence module. Every autonomous decision made by the system is:
- **Confidence-Gated**: Actions below 85% confidence are routed to a human operator.
- **Immutable Logged**: Decision paths are recorded in a high-integrity audit layer.
- **Regulatory Matched**: Decisions are evaluated against a library of national and international legal frameworks.

---

## 🏗️ Secure Development Standards

- **Secret Management**: All keys and credentials must be injected via secure `.env` or Vault.
- **Dependency Guard**: Automatic vulnerability scanning via **CodeQL** and Biome.
- **Encryption**: AES-256 for all stored artifacts and TLS 1.3 for all inter-service communication.

---

## ⚠️ Responsible Disclosure

If you discover a security vulnerability, please refer to our [SECURITY.md](../SECURITY.md) policy for reporting instructions. Do not use GitHub issues for reporting security risks.
