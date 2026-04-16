# DISHA v6.0.0 — Sovereign Intelligence Platform

<p align="center">
  <img src="disha/docs/images/banner_v6.png" alt="DISHA v6.0.0" width="100%">
</p>

## 🛡️ National Protection & Citizen Safety
DISHA v6.0.0 is a world-class sovereign AI platform designed for **National Protection**, **Predictive Resilience**, and **Autonomous Self-Healing**.

It has evolved from a cognitive operating system into a decentralized guardian for critical infrastructure and public welfare.

---

## 🏛️ New Repository Architecture
DISHA now operates as a high-scale monorepo:

- **`/disha/apps`**: Citizen interfaces (Web Command Dashboard, Mobile).
- **`/disha/services`**: Microservices for Alerts, Forecaster, Cyber-Defense, and Audit Logging.
- **`/disha/ai`**: The Sovereign Intelligence Core (Planner, RAG, Physics, Strategy).
- **`/disha/infra`**: Kubernetes and Docker orchestration.

---

## ⚡ Key v6 Features
1. **National Awareness**: Live telemetry ingestion for weather, crime, and health indicators.
2. **Autonomous Guardian**: Built-in self-healing layer that auto-restarts failed services and rolls back vulnerable deployments.
3. **Predictive Command Center**: A premium Glassmorphism-based dashboard with real-time risk scores and national mapping.
4. **Sovereign Planner**: An upgraded 7-stage cognitive loop tuned for national safety priority.

---

## 🚀 Quick Start (v6)

### Prerequisites
- **Bun** >= 1.2.0
- **Python** >= 3.12
- **Docker**

### Deployment
```bash
# Install dependencies for all workspaces
bun install

# Start the Sovereign Command Center (Web)
bun dev:web

# Launch Intelligence Services (FastAPI)
cd disha/services/alerts && python main.py
cd disha/services/forecast && python main.py
cd disha/services/autonomous && python main.py
```

---

## 🔒 Governance & Ethical AI
DISHA v6 includes a dedicated **Audit Layer** that records every autonomous decision. All critical actions requiring human-in-the-loop are confidence-gated via the **Intelligence Core**.

---

<p align="center">
  <sub>DISHA — Sovereign Intelligence for a Resilient Nation.</sub>
</p>
