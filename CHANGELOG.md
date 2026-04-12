# Changelog

All notable changes to the **Disha AGI Platform** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v3.1.0] — 2026-04-12

### 🐛 Bug Fixes
- **Orchestrator DNS relationship logic** — Fixed `_build_relationships()` in `ai-platform/backend/app/agents/orchestrator.py` to validate target entity type for DNS records. Previously, DNS records created spurious `RESOLVES_TO` edges to any entity type; now restricted to `host` and `domain` targets only.
- **Quality score overflow** — Fixed `learning_controller.py` credibility scoring that could exceed the documented 0–25 range (max was 30 due to uncapped `cred_bonus`). Now properly capped with `min(25, ...)`.

### 🔧 Configuration Fixes
- **server.json** — Replaced incorrect `monster-codemaster` name and `Monster/claude-code` repository URL with correct `disha-mcp` and `Tashima-Tarsh/Disha`.
- **mcp-server/server.json** — Same corrections as above.
- **mcp-server/package.json** — Fixed package name, mcpName, repository URL, homepage, bugs URL, author, and bin entry to reflect the Disha project.

### 📝 Documentation Updates
- **CONTRIBUTING.md** — Fixed clone URL from `Monster/claude-code` to `Tashima-Tarsh/Disha`, added Python prerequisites and module setup instructions.
- **USAGE_GUIDE.md** — Complete rewrite to accurately document Disha's CLI, AI platform, decision engine, historical strategy, cyber defense, MCP server, training commands, continuous learning, sentinel monitoring, and troubleshooting.
- **README.md** — Updated to v3.1.0, added comprehensive review section documenting all bug fixes and improvements.
- **CHANGELOG.md** — Replaced stub content with full version history from v1.0.0 to v3.1.0.
- **WIKI.md** — Added v3.1.0 review and bug fix documentation.

### 🔍 Repository Review
- Full codebase audit: 2,477 source files, 9 CI workflows, 22 test files, 13 Dockerfiles
- Verified no merge conflict remnants across entire repository
- Verified all Python module imports resolve correctly with no circular dependencies
- Verified all 7 AI agents properly inherit from BaseAgent and connect through orchestrator
- Verified RL environment STATE_DIM=12 matches policy network input dimensions
- Verified GNN models gracefully fall back when torch_geometric is unavailable

---

## [v3.0.0-learning] — 2026-04-12

### Added
- **Universal knowledge bases** — 8 domains: Physics, Mathematics, Computing, Chemistry (all 118 elements), Law & Politics, Cybersecurity, Innovation & Future Tech, Historical Strategy
- **Cross-domain knowledge engine** (`scripts/knowledge_engine.py`) — loads all 8 domains and builds cross-domain knowledge graphs
- **Continuous training pipeline** (`scripts/continuous_train.py`) — RL, GNN, decision engine training with online/offline data
- **Sentinel monitoring system** (`scripts/sentinel/`) — threat_monitor.py (5 feeds), model_orchestrator.py (5 AI providers), guardian.py (auto-heal + health checks)
- **Auto-learning bot** (`auto_learning/`) — RAG pipeline, LLaMA fine-tuning, multi-agent coordination, advanced reasoning
- **Disha Mythos workflow** — scheduled learning agent execution

### Verified
- GitHub Code Review audit passed ✓
- 28 sentinel tests passing
- All 8 knowledge domains loaded and validated

---

## [v2.0.0] — 2025-Q2

### Added
- **Quantum Physics Intelligence** (`quantum-physics/`) — Qiskit circuit simulator, space APIs, physics engines
- **Decision Framework** (`decision-framework/`) — 4 agents (Political, Legal, Ideology, Security) with FAISS retrieval
- **Decision Engine** (`decision-engine/`) — Refined multi-agent reasoning with consensus voting
- **100% open-source API migration** — Replaced all paid/stub APIs with free alternatives (ip-api, HackerTarget, Feodo Tracker, OpenStreetMap, local Whisper, LLaVA via Ollama)
- **Multimodal AGI** — Vision agent (GPT-4o/LLaVA), Audio agent (Whisper), cross-modal fusion

### Changed
- Upgraded from gpt-3.5-turbo to gpt-4o-mini / gpt-4o
- IP geolocation: hardcoded "India" → ip-api.com
- Domain intelligence: hardcoded "sample" → HackerTarget passive DNS
- Maps: Google Maps → OpenStreetMap + Leaflet

---

## [v1.0.0] — 2025-Q1

### Added
- **Core CLI Engine** — TypeScript + Bun + React/Ink with 40+ tools and 50+ commands
- **AI Intelligence Platform** — FastAPI backend with 7 specialized agents (OSINT, Crypto, Detection, Graph, Reasoning, Vision, Audio)
- **Reinforcement Learning Engine** — PPO policy with 12-dim state, 8 actions, prioritized experience replay
- **Graph Neural Networks** — GCN encoder, link predictor, graph classifier
- **Cyber Defense System** — Cowrie/Dionaea/OpenCanary honeypots, PyTorch threat classifier
- **Historical Strategy Intelligence** — 32+ conflicts, Random Forest + MLP classifier, scenario simulation
- **Web Dashboard** — Next.js 14 + Tailwind CSS with 78+ components
- **MCP Server** — Model Context Protocol v1.29 server with STDIO/HTTP/SSE transports
- **Docker infrastructure** — 13 Dockerfiles, multi-stage builds
- **CI/CD pipelines** — 9 GitHub Actions workflows (CI, AI Platform, Decision Engine, Cyber Defense, CodeQL, Sentinel, Continuous Training, Modules, Mythos)

---

## [0.1.0] — 2024-Q4

### Added
- Initial project scaffold
- npm package dependencies setup across root, mcp-server, and web workspaces