# 🛡️ Disha AGI Platform — A smart security system that observes, analyzes, and neutralizes digital threats using adaptive AI and behavioral intelligence.

<p align="center">
  <img src="https://img.shields.io/badge/Files-2%2C198-blue?style=flat-square" alt="Files">
  <img src="https://img.shields.io/badge/Lines_of_Code-555K+-green?style=flat-square" alt="LoC">
  <img src="https://img.shields.io/badge/Agents-7-orange?style=flat-square" alt="Agents">
  <img src="https://img.shields.io/badge/Tools-40+-red?style=flat-square" alt="Tools">
  <img src="https://img.shields.io/badge/RL_Engine-PPO-purple?style=flat-square" alt="RL">
  <img src="https://img.shields.io/badge/Multimodal-Vision%20%2B%20Audio-teal?style=flat-square" alt="Multimodal">
</p>

> **Disha** (दिशा) — *"Direction"* in Sanskrit. A self-learning, multi-agent AGI platform combining a production-grade AI coding assistant with a distributed threat intelligence system featuring reinforcement learning, multimodal analysis, and autonomous agent collaboration.

---

## ✨ What is Disha?

Disha is a **two-layer AI platform**:

| Layer | Stack | Purpose |
|-------|-------|---------|
| **Core CLI Engine** | TypeScript · Bun · React | AI coding assistant with 40+ tools, 50+ commands, IDE integration, streaming LLM |
| **AI Intelligence Platform** | Python · FastAPI · PyTorch | Multi-agent threat intel with RL optimization, multimodal fusion, distributed collaboration |

### Key Capabilities

| Feature | Description |
|---------|-------------|
| 🧠 **Self-Learning RL** | PPO reinforcement learning optimizes investigation strategies from human feedback |
| 👁️ **Multimodal AGI** | Fuses text + GPT-4o vision + Whisper audio for comprehensive threat analysis |
| 🌐 **Distributed Cluster** | AutoGen-style multi-agent collaboration with peer review and consensus voting |
| 📈 **Self-Improving Prompts** | Evolutionary optimization with Thompson sampling, mutation, crossover, few-shot |
| 🏆 **Intelligence Ranking** | PageRank + temporal decay + multi-criteria entity scoring |
| 🔗 **Knowledge Graph** | Neo4j entity mapping + GNN link prediction |
| ⚡ **Real-Time Streaming** | WebSocket alerts, Kafka event streaming, live dashboard |
| 🛠️ **40+ AI Tools** | File I/O, shell, web, MCP, LSP, agent spawning |
| 🔌 **50+ Commands** | Git, review, security, config, session, MCP management |
| 🖥️ **Web Dashboard** | 78 components, real-time collaboration, command palette, accessibility, mobile |
| 👥 **Multiplayer Collaboration** | Presence avatars, cursor ghosts, typing indicators, annotations |
| ♿ **Accessibility** | WCAG-compliant with skip nav, focus traps, live regions, screen reader support |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       DISHA PLATFORM                            │
├─────────────────────────┬───────────────────────────────────────┤
│  CORE CLI (TypeScript)  │   AI INTELLIGENCE (Python/FastAPI)    │
│                         │                                       │
│  Query Engine           │   7 Specialized Agents                │
│  ├─ Claude API stream   │   ├─ OSINT (Shodan, DNS, SpiderFoot) │
│  ├─ Tool-call loops     │   ├─ Crypto (Ethereum/Etherscan)     │
│  └─ Auto-compaction     │   ├─ Detection (Isolation Forest)    │
│                         │   ├─ Graph (Neo4j/Cypher)            │
│  40+ Tools              │   ├─ Reasoning (GPT-4/LangChain)     │
│  ├─ Bash, Files, Web    │   ├─ Vision (GPT-4o)                 │
│  ├─ MCP, LSP, Agents    │   └─ Audio (Whisper)                 │
│  └─ Plans, Tasks        │                                       │
│                         │   RL Engine (PPO + Replay)            │
│  50+ Commands           │   Prompt Optimizer (Evolutionary)     │
│  ├─ Git, Review         │   Intelligence Ranker (PageRank)      │
│  ├─ Config, Session     │   Cluster Coordinator (AutoGen)       │
│  └─ MCP, Plugins        │   Knowledge Graph (Neo4j + GNN)       │
│                         │                                       │
│  Terminal UI (Ink)      │   Services:                           │
│  Bridge (VS Code)       │   ChromaDB · Kafka · WebSocket        │
│  Coordinator (Teams)    │   Alerts · Vector Store               │
├─────────────────────────┴───────────────────────────────────────┤
│              WEB DASHBOARD (Next.js + Tailwind)                 │
│  78 Components · ⌘K Palette · Collaboration · a11y · Mobile    │
│  Tools Viz · Notifications · Settings · File Viewer · Export    │
├─────────────────────────┬───────────────────────────────────────┤
│   AI Dashboard (9 comp) │  22 API Endpoints + WebSocket         │
├─────────────────────────┼───────────────────────────────────────┤
│   Docker (7 services)   │  PostgreSQL│Neo4j│ChromaDB│Kafka      │
└─────────────────────────┴───────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Option 1: CLI Engine

```bash
curl -fsSL https://bun.sh/install | bash   # Install Bun
bun install                                  # Install dependencies
cp .env.example .env                         # Configure API keys
bun run dev                                  # Start CLI
```

### Option 2: AI Platform

```bash
cd ai-platform/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000    # Start backend

cd ../frontend
npm install && npm run dev                   # Start dashboard
```

### Option 3: Full Stack (Docker)

```bash
cd ai-platform/docker
docker-compose up -d
# Backend:  http://localhost:8000
# Frontend: http://localhost:3001
# Neo4j:    http://localhost:7474
```

---

## 🤖 Intelligence Agents

| Agent | Data Sources | Output |
|-------|-------------|--------|
| **OSINT** | Shodan, DNS, SpiderFoot | Hosts, domains, vulnerabilities |
| **Crypto** | Etherscan API | Wallets, transactions, risk scores |
| **Detection** | Isolation Forest / Z-score | Ranked anomalies |
| **Graph** | Neo4j / Cypher | Entity relationships, communities |
| **Reasoning** | GPT-4 / LangChain | Risk assessment, threat reports |
| **Vision** | GPT-4o Vision API | Image classification, OCR, object detection |
| **Audio** | Whisper API | Transcription, keyword spotting, threat analysis |

### Investigation Pipeline

```
Data Collection ──► Anomaly Detection ──► Graph Storage ──► LLM Reasoning ──► Report
  (OSINT+Crypto)    (Isolation Forest)    (Neo4j+GNN)      (GPT-4)         (Compiled)
```

---

## 🧠 Reinforcement Learning

| Component | Detail |
|-----------|--------|
| **Algorithm** | Proximal Policy Optimization (PPO) |
| **State** | 13-dim (entities, anomalies, risk, depth, agents_used, time) |
| **Actions** | 8 (run 5 agents, increase/decrease depth, stop) |
| **Reward** | Entity discovery (+0.1), anomaly (+0.5), risk change (×2.0), time penalty (-0.01) |
| **Policy** | Actor-Critic MLP (13→64→64→8) with action masking |
| **Replay** | Prioritized experience buffer (10K transitions, α=0.6) |
| **Feedback** | Human true_positive/rating → RL reward signal |

---

## 📊 Intelligence Ranking

```
composite_score = threat×0.30 + impact×0.25 + confidence×0.20 + centrality×0.15 + recency×0.10
```

- **Centrality**: PageRank (damping=0.85, 20 iterations)
- **Recency**: Exponential decay (24h half-life)
- **Confidence**: Multi-source corroboration (1 source=0.3, 3+=1.0)
- **Agent Reliability**: F1-score tracking with precision/recall per agent

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **CLI Runtime** | Bun 1.1+ · TypeScript · React 19 + Ink |
| **Backend** | FastAPI 0.115 · Uvicorn · Pydantic |
| **LLM** | Anthropic Claude · OpenAI GPT-4/4o · LangChain |
| **ML** | PyTorch 2.6 · PyTorch Geometric · PyOD |
| **Vector DB** | ChromaDB 0.5 |
| **Graph DB** | Neo4j 5.24 |
| **Streaming** | Kafka · WebSocket |
| **Frontend** | Next.js 14 · Tailwind CSS |
| **Protocol** | Model Context Protocol (MCP) v1.29 |
| **Deployment** | Docker · Vercel · Railway |

---

## 📈 Project Stats

| Metric | Count |
|--------|-------|
| Source files | 2,198 |
| Lines of code | 555,457+ |
| Intelligence agents | 7 |
| AI tools | 40+ |
| CLI commands | 50+ |
| API endpoints | 22 |
| Web components | 78 (+ 9 AI dashboard) |
| Custom hooks | 14 |
| Dashboard tabs | 8 |
| Docker services | 7 |
| Collaboration features | 5 (presence, cursors, typing, annotations) |
| a11y components | 5 (WCAG-compliant) |
| Documentation pages | 32+ |

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| **[WIKI.md](./WIKI.md)** | Complete project wiki with every system documented |
| **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** | CLI usage, API endpoints, advanced features |
| **[docs/architecture.md](./docs/architecture.md)** | System architecture deep-dive |
| **[docs/tools.md](./docs/tools.md)** | Complete tool catalog with schemas |
| **[docs/commands.md](./docs/commands.md)** | Complete command catalog |
| **[docs/subsystems.md](./docs/subsystems.md)** | Bridge, MCP, plugins, skills, memory |
| **[docs/exploration-guide.md](./docs/exploration-guide.md)** | Code navigation guide |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | How to contribute |
| **[Skill.md](./Skill.md)** | Development conventions |
| **[ai-platform/README.md](./ai-platform/README.md)** | AI platform setup guide |

---

## 🤝 Contributing

1. Create a feature branch from `main`
2. Keep PR scope focused (one feature per PR)
3. Add type annotations for all new code
4. Update documentation for new modules
5. Request review before merge

---

## 🏛️ License

See [LICENSE](./LICENSE) for details.

---

<p align="center">
  <b>Disha</b> — Self-learning · Distributed · Multimodal · Collaborative · Accessible
  <br>
  <sub>2,198 files · 555K+ lines · 7 agents · 40+ tools · 50+ commands · PPO RL · PageRank · Vision + Audio · AutoGen · 78 web components</sub>
</p>
