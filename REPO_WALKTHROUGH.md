# Repository Walkthrough

This guide provides an architectural map of the **DISHA v6.0.0 Monorepo**. It is designed to help new developers, contributors, and researchers navigate the ecosystem with clarity and speed.

## 📂 Root Structure

The project is organized into a cohesive, decoupled monorepo under the `/disha` namespace.

```text
/disha
├── apps/               # UX & Command Interfaces
├── services/           # Backend Microservices & Domain Logic
├── ai/                 # Sovereign Intelligence Core
├── infra/              # Orchestration & Infrastructure
├── scripts/            # System Orchestrators & Training
├── docs/               # Specialized Documentation Manuals
└── legacy-root-src/    # Core CLI & Shared Logic
```

---

## 🏛️ Core Modules

### 1. UX Layer (`/disha/apps`)
- **`web/`**: The **Sovereign Command Center**. A high-end Next.js dashboard with live telemetry visualization using Leaflet and Glassmorphism components.

### 2. Service Registry (`/disha/services`)
This and the `/ai` layer form the heart of DISHA. Each service is a standalone microservice.
- **`ai-platform/`**: The unified reasoning backend using FastAPI.
- **`alerts/`**: Real-time incident notification engine.
- **`forecast/`**: Predictive resilience model for national telemetry.
- **`cyber/`**: The Sentinel Shield (honeypots and threat classifiers).
- **`mcp/`**: Model Context Protocol (MCP) server implementation for universal tool integration.

### 3. Sovereign Intelligence Core (`/disha/ai`)
- **`core/`**: Implements the **DISHA-MIND** 7-stage cognitive loop (`cognitive_loop.py`).
- **`models/`**: Domain-specific logic including World Models and Simulation Scenarios.
- **`physics/`**: High-fidelity Molecular Dynamics engines (Torch-accelerated).
- **`strategy/`**: Historical and geopolitical strategy simulation engines.

---

## ⚡ Key System Entry Points

- **`package.json`**: The root of the monorepo. Use `bun run build` to unify the system.
- **`disha/scripts/disha_mythos.py`**: The primary system orchestrator. Run this to initiate self-healing, protection, and learning cycles.
- **`disha/scripts/continuous_train.py`**: The entry point for the RL and GNN training pipelines.

---

## 🔄 How Data Moves

1.  **Ingestion**: Signals arrive via CLI input or Kafka telemetry streams.
2.  **Perception**: The Intelligence Core classifies intent and extracts entities.
3.  **Deliberation**: Three specialized agents (Planner, Critic, Executor) vote on the best response path.
4.  **Action**: Confident results are sent to the UX Layer or executed as a system fix.
5.  **Audit**: Every decision is immutably logged in the `Audit Layer` for regulatory review.

---

## 🛠️ How to Extend DISHA

### Adding a New Skill
Skills are defined as discrete logic modules. To add a new capability:
1.  Define the logic in a new directory under `disha/services/`.
2.  Expose the service via a FastAPI endpoint.
3.  Register the new service capability in the `CognitiveEngine` intent-mapping.

### Adding a New Agent
1.  Create the agent logic in `disha/ai/core/agents/`.
2.  Register the agent in the `deliberation.py` stage of the cognitive loop.
