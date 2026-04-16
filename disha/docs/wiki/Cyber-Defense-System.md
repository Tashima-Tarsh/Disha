# Cyber Defense System (Sentinel Shield)

The **Sentinel Shield** is DISHA's proactive defense layer, moving beyond passive logging to autonomous neutralization.

## 🛡️ The Sentinel Agent

Sentinel is a background defensive orchestrator that runs continuously.
- **Honeypot Integration**: Low-interaction (Cowrie) and high-interaction honeypots feed real-time attack data into DISHA.
- **Threat Classifier**: ML models categorize attacks into known families (Ransomware, Botnet, APT).
- **Sovereign Shield**: The system can unilaterally block IPs, revoke JWTs, or restart compromised infrastructure.

---

## 🔄 Autonomous Self-Healing

The **Guardian Logic** in DISHA monitors the health of all registered microservices.

1.  **Pulse Monitoring**: Services post regular heartbeats.
2.  **Anomalous Behavior**: If a service's latency or error rate spikes, Sentinel triggers a diagnostic report.
3.  **Healing Action**: If the diagnostic fails, Sentinel uses the orchestrated Docker/K8s APIs to restart or rollback the service.

---

## 🔒 Zero-Trust Sovereignty

DISHA is designed for air-gapped security:
- **Local LLMs**: Fully compatible with Ollama/Llama-cpp for 100% data privacy.
- **Local RAG**: Neo4j and ChromaDB run inside the cluster with no external cloud connection required.
- **Open Intelligence**: Only uses public, non-authenticated OSINT sources by default to prevent credential leakage.
