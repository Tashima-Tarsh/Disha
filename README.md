<p align="center">
  <img src="docs/images/banner.svg" alt="DISHA AGI Platform" width="100%">
</p>

<h1 align="center">DISHA — दिशा</h1>

<p align="center">
  <em>"Direction" in Sanskrit — A self-evolving, multi-agent AGI platform for intelligence, cognitive reasoning, defense, and discovery.</em>
</p>

<p align="center">
  <a href="./WIKI.md#getting-started"><img src="https://img.shields.io/badge/Get_Started-0f0f0f?style=for-the-badge&logo=rocket&logoColor=white" alt="Get Started"></a>
  <a href="./WIKI.md"><img src="https://img.shields.io/badge/Wiki-6366f1?style=for-the-badge&logo=gitbook&logoColor=white" alt="Wiki"></a>
  <a href="./CONTRIBUTING.md"><img src="https://img.shields.io/badge/Contribute-22c55e?style=for-the-badge&logo=github&logoColor=white" alt="Contribute"></a>
  <a href="./USAGE_GUIDE.md"><img src="https://img.shields.io/badge/Usage_Guide-f59e0b?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Usage Guide"></a>
  <a href="./CHANGELOG.md"><img src="https://img.shields.io/badge/Changelog-ef4444?style=for-the-badge&logo=git&logoColor=white" alt="Changelog"></a>
</p>

<p align="center">
  <a href="https://github.com/Tashima-Tarsh/Disha/stargazers"><img src="https://img.shields.io/github/stars/Tashima-Tarsh/Disha?style=flat-square&color=yellow" alt="Stars"></a>
  <a href="https://github.com/Tashima-Tarsh/Disha/network/members"><img src="https://img.shields.io/github/forks/Tashima-Tarsh/Disha?style=flat-square&color=blue" alt="Forks"></a>
  <a href="https://github.com/Tashima-Tarsh/Disha/commits/main"><img src="https://img.shields.io/github/last-commit/Tashima-Tarsh/Disha?style=flat-square&color=purple" alt="Last Commit"></a>
  <a href="https://github.com/Tashima-Tarsh/Disha/actions/workflows/ci.yml"><img src="https://github.com/Tashima-Tarsh/Disha/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/Tashima-Tarsh/Disha/actions/workflows/cognitive-engine-ci.yml"><img src="https://github.com/Tashima-Tarsh/Disha/actions/workflows/cognitive-engine-ci.yml/badge.svg" alt="Cognitive Engine CI"></a>
  <a href="https://github.com/Tashima-Tarsh/Disha/actions/workflows/ai-platform-ci.yml"><img src="https://github.com/Tashima-Tarsh/Disha/actions/workflows/ai-platform-ci.yml/badge.svg" alt="AI Platform CI"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v4.0.0-6366f1?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Files-3%2C700+-0ea5e9?style=flat-square" alt="Files">
  <img src="https://img.shields.io/badge/Lines_of_Code-452K+-22c55e?style=flat-square" alt="LoC">
  <img src="https://img.shields.io/badge/Cognitive_Stages-7-8b5cf6?style=flat-square" alt="Cognitive Stages">
  <img src="https://img.shields.io/badge/AI_Agents-7-f59e0b?style=flat-square" alt="Agents">
  <img src="https://img.shields.io/badge/Tools-40+-ef4444?style=flat-square" alt="Tools">
  <img src="https://img.shields.io/badge/Knowledge_Domains-8-14b8a6?style=flat-square" alt="Domains">
  <img src="https://img.shields.io/badge/CI_Pipelines-10-ec4899?style=flat-square" alt="CI Pipelines">
</p>

<br>

---

## What is DISHA?

DISHA is a production-grade **AGI platform** built from first principles — combining a 7-layer intelligent architecture, real-time multi-agent reasoning, 3-layer memory, quantum-inspired decision making, and a full-stack observability dashboard.

It is not a wrapper around a single LLM. It is a **cognitive system** designed to perceive, reason, deliberate, act, reflect, and learn — autonomously, in a loop.

```
Input → Perceive → Attend → Reason → Deliberate → Act → Reflect → Consolidate → Output
                              ↑                                          |
                              └──────────── Memory & Learning ──────────┘
```

---

## Architecture Overview

DISHA is organized into **7 layers**, each independently deployable and CI-tested.

| Layer | Module | Purpose |
|-------|--------|---------|
| 1 | `src/` | Core CLI Engine (TypeScript + Bun + React/Ink) |
| 2 | `ai-platform/` | Multi-Agent Intelligence Platform (FastAPI + Next.js) |
| 3 | `cognitive-engine/` | DISHA-MIND: 7-Stage Cognitive Loop |
| 4 | `decision-engine/` | 4-Agent Reasoning Framework |
| 5 | `cyber-defense/` | Honeypot Network + ML Threat Detection |
| 6 | `quantum-physics/` | Quantum Circuit Simulator + Physics Engines |
| 7 | `historical-strategy/` | AI Military & Strategic Intelligence |

---

## Layer 3 — DISHA-MIND Cognitive Engine

The cognitive engine is the intelligence core of DISHA. It processes every input through 7 stages, maintaining persistent memory across sessions.

### 7-Stage Cognitive Loop

```
Stage 1  PERCEIVE      Intent classification, entity extraction, uncertainty estimation
Stage 2  ATTEND        3-layer memory retrieval, working memory decay management
Stage 3  REASON        Parallel deductive / inductive / abductive hypothesis generation
Stage 4  DELIBERATE    Multi-agent consensus (Planner + Executor + Critic) + dissent preservation
Stage 5  ACT           Confidence-gated action selection or clarification request
Stage 6  REFLECT       Quality scoring, metacognitive analysis, learning trigger detection
Stage 7  CONSOLIDATE   Episodic storage, concept extraction, semantic graph update
```

### 3-Layer Memory Architecture

| Layer | Type | Capacity | Persistence |
|-------|------|----------|-------------|
| Working | Volatile attention buffer | 8 slots | In-process |
| Episodic | Time-stamped event log | Unlimited | JSON on disk |
| Semantic | Concept relationship graph | Unlimited | JSON on disk |

### Multi-Agent Deliberation

Three independent agents reason in parallel:

- **Planner** — Strategic recommendation
- **Executor** — Tactical recommendation
- **Critic** — Challenge and dissent

Consensus is computed by confidence-weighted voting. Dissenting views are **preserved**, not discarded — they surface in the reflection stage and influence learning.

Iterative consensus: if inter-agent agreement < 0.4, bottom-50% agents re-deliberate (up to 3 rounds).

---

## Layer 2 — AI Intelligence Platform

### Backend (FastAPI)

| Component | Description |
|-----------|-------------|
| Orchestrator | 5-phase investigation pipeline |
| OSINT Agent | Passive DNS, IP intel, threat feeds |
| Crypto Agent | Blockchain address analysis |
| Detection Agent | Anomaly detection from entities |
| Graph Agent | Neo4j knowledge graph (UNWIND batch) |
| Reasoning Agent | LLM-based chain-of-thought analysis |
| Vision Agent | GPT-4o / LLaVA image analysis |
| Audio Agent | Whisper transcription + analysis |
| RL Engine | PPO (12-dim state, 8 actions, prioritized replay) |
| GNN | GCN encoder + link predictor + graph classifier |
| Vector Store | ChromaDB (async, non-blocking) |
| Ranking | PageRank + temporal decay |
| Prompt Optimizer | Evolutionary optimization |

### Frontend (Next.js + Tailwind)

14 visualization panels including:
- Real-time alerts feed (4 severity levels)
- Knowledge graph canvas
- RL training metrics
- Quantum physics interface
- Geographic threat map
- **Cognitive Loop visualizer** — live 7-stage pipeline with working memory bars, hypothesis panel, agent deliberations, reflection quality gauge

---

## Layer 1 — Core CLI Engine

Built with TypeScript, Bun, and React/Ink for terminal rendering.

- **40+ tools** — file I/O, bash execution, web search, LSP, MCP, agent spawning
- **100+ commands** — git, code review, configuration, model management
- **Model Context Protocol (MCP)** — server with STDIO/HTTP/SSE transports
- **IDE bridge** — VS Code and JetBrains integration
- **OpenTelemetry** — traces, metrics, logs out of the box

---

## Security Hardening (v4.0.0)

| Issue | Fix |
|-------|-----|
| WebSocket unauthenticated | JWT validation via `?token=` query param; closes with 4001/4003 on failure |
| Empty SECRET_KEY signed valid JWTs | `field_validator` auto-generates secure 32-byte key in dev; enforces explicit setting in production |
| Hardcoded CORS origins | `CORS_ORIGINS` env var with `get_cors_origins()` method |
| Blocking async event loop | ChromaDB calls wrapped in `asyncio.to_thread()` |
| N+1 Neo4j writes | Single `UNWIND $rows` batch query replaces per-entity MERGE loop |
| `/context` no input validation | `Query(min_length=1, max_length=500, ge=1, le=20)` guards |

---

## CI/CD

10 GitHub Actions pipelines, all green:

| Pipeline | Trigger | Checks |
|----------|---------|--------|
| `ci.yml` | push/PR to main | Biome lint + Bun tests |
| `cognitive-engine-ci.yml` | `cognitive-engine/**` | flake8 + pytest (≥20% coverage) |
| `ai-platform-ci.yml` | `ai-platform/**` | flake8 + pytest |
| `decision-engine-ci.yml` | `decision-engine/**` | flake8 + pytest |
| `cyber-defense-ci.yml` | `cyber-defense/**` | flake8 + pytest |
| `sentinel-ci.yml` | `scripts/sentinel/**` | flake8 + pytest |
| `codeql.yml` | Scheduled | SAST (TypeScript + Python) |
| `continuous-training.yml` | Daily 2 AM UTC | RL + GNN + Decision Engine training |
| `disha-mythos.yml` | Scheduled | Learning agent execution |
| `modules-ci.yml` | push to main | Module-level testing |

---

## Knowledge Base

8 domains, continuously expanding:

| Domain | Coverage |
|--------|----------|
| Physics | Quantum mechanics, relativity, unified field theory |
| Mathematics | Number theory, calculus, probability, discrete math |
| Computing | Algorithms, systems, CS fundamentals |
| Chemistry | All 118 elements of the periodic table |
| Law & Politics | Constitutional law, case law, legal frameworks |
| Cybersecurity | Threat taxonomy, OSINT, defense patterns |
| Innovation | Emerging tech, future systems |
| Historical Strategy | 32+ military conflicts, scenario simulation |

---

## Quick Start

### Prerequisites

- Bun ≥ 1.1.0
- Python ≥ 3.11
- Docker + Docker Compose
- Node.js ≥ 18 (for frontend)

### CLI

```bash
git clone https://github.com/Tashima-Tarsh/Disha.git
cd Disha
bun install
bun run build
./dist/cli.mjs
```

### AI Platform (Full Stack)

```bash
cd ai-platform/docker
docker compose up -d
```

Services start at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Cognitive Engine: `http://localhost:8001`
- Neo4j: `http://localhost:7474`
- ChromaDB: `http://localhost:8002`

### Cognitive Engine (Standalone)

```bash
cd cognitive-engine
pip install -r requirements.txt
python -m pytest tests/ -v
```

```python
from cognitive_engine import CognitiveEngine

engine = CognitiveEngine()
state = await engine.process("Analyze domain evil.io for threats", session_id="s1")
print(state.action)
```

---

## Project Stats

| Metric | Count |
|--------|-------|
| Files | 3,700+ |
| Lines of Code | 452,000+ |
| Python Modules | 80+ |
| TypeScript/TSX Files | 100+ |
| AI Agents | 7 |
| Cognitive Stages | 7 |
| Memory Layers | 3 |
| API Endpoints | 49+ |
| Tools | 40+ |
| Commands | 100+ |
| CI Pipelines | 10 |
| Dockerfiles | 19 |
| Knowledge Domains | 8 |
| Test Files | 13+ |
| Historical Scenarios | 32+ |

---

## About the Creator

**Tashima Tarsh** — AGI researcher, full-stack engineer, and system architect. DISHA is an independent research project exploring cognitive architectures, multi-agent systems, and autonomous intelligence.

- GitHub: [@Tashima-Tarsh](https://github.com/Tashima-Tarsh)

---

## Links

| Resource | Link |
|----------|------|
| Wiki | [WIKI.md](./WIKI.md) |
| Changelog | [CHANGELOG.md](./CHANGELOG.md) |
| Contributing | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| Usage Guide | [USAGE_GUIDE.md](./USAGE_GUIDE.md) |
| Issues | [GitHub Issues](https://github.com/Tashima-Tarsh/Disha/issues) |

---

<p align="center">
  <sub>DISHA — दिशा — Direction. Built with intention.</sub>
</p>
