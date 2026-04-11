<p align="center">
  <img src="https://img.shields.io/badge/Disha-AGI%20Platform-blueviolet?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDVMMjIgN0wxMiAyeiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yIDE3bDEwIDVsMTAtNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMiAxMmwxMCA1IDEwLTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+" alt="Disha">
  <br>
  <img src="https://img.shields.io/badge/Files-2%2C177-blue?style=flat-square" alt="Files">
  <img src="https://img.shields.io/badge/Lines_of_Code-546K+-green?style=flat-square" alt="LoC">
  <img src="https://img.shields.io/badge/Agents-7_Intelligence-orange?style=flat-square" alt="Agents">
  <img src="https://img.shields.io/badge/Tools-40+-red?style=flat-square" alt="Tools">
  <img src="https://img.shields.io/badge/Commands-50+-purple?style=flat-square" alt="Commands">
  <img src="https://img.shields.io/badge/API_Endpoints-22-teal?style=flat-square" alt="Endpoints">
</p>

---

# 📖 DISHA — Complete Project Wiki

> **Disha** (दिशा) — *"Direction"* in Sanskrit. A self-learning, multi-agent AGI platform that combines a production-grade AI coding assistant with a distributed threat intelligence system featuring reinforcement learning, multimodal analysis, and autonomous agent collaboration.

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Architecture Overview](#2-architecture-overview)
- [3. Core CLI Engine (TypeScript)](#3-core-cli-engine-typescript)
  - [3.1 Query Engine](#31-query-engine)
  - [3.2 Tool System (40+ Tools)](#32-tool-system-40-tools)
  - [3.3 Command System (50+ Commands)](#33-command-system-50-commands)
  - [3.4 Terminal UI (Ink)](#34-terminal-ui-ink)
  - [3.5 Bridge & IDE Integration](#35-bridge--ide-integration)
  - [3.6 MCP Protocol](#36-mcp-protocol)
  - [3.7 AI Model Management](#37-ai-model-management)
  - [3.8 Plugins, Skills & Memory](#38-plugins-skills--memory)
  - [3.9 Multi-Agent Coordinator](#39-multi-agent-coordinator)
- [4. AI Intelligence Platform (Python)](#4-ai-intelligence-platform-python)
  - [4.1 Agent System](#41-agent-system)
  - [4.2 Reinforcement Learning Engine](#42-reinforcement-learning-engine)
  - [4.3 Multimodal AGI (Vision + Audio)](#43-multimodal-agi-vision--audio)
  - [4.4 Distributed AGI Cluster](#44-distributed-agi-cluster)
  - [4.5 Self-Improving Prompts](#45-self-improving-prompts)
  - [4.6 Intelligence Ranking System](#46-intelligence-ranking-system)
  - [4.7 Services Layer](#47-services-layer)
  - [4.8 Graph Neural Networks](#48-graph-neural-networks)
- [5. API Reference](#5-api-reference)
- [6. Frontend Dashboard](#6-frontend-dashboard)
- [7. MCP Server](#7-mcp-server)
- [8. Infrastructure & Deployment](#8-infrastructure--deployment)
- [9. Tech Stack](#9-tech-stack)
- [10. Project Statistics](#10-project-statistics)
- [11. Getting Started](#11-getting-started)
- [12. Contributing](#12-contributing)

---

## 1. Executive Summary

Disha is a **two-layer AI platform** combining:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Core CLI Engine** | TypeScript / Bun / React | AI coding assistant with 40+ tools, 50+ commands, IDE integration, streaming LLM queries |
| **AI Intelligence Platform** | Python / FastAPI / PyTorch | Multi-agent threat intelligence with RL optimization, multimodal analysis, distributed collaboration |

### What Makes Disha Unique

- **🧠 Self-Learning** — PPO reinforcement learning optimizes investigation strategies from human feedback
- **👁️ Multimodal** — Fuses text, vision (GPT-4o), and audio (Whisper) for comprehensive threat analysis
- **🌐 Distributed Agents** — AutoGen-style multi-agent cluster with peer review and consensus voting
- **📈 Self-Improving** — Evolutionary prompt optimization with Thompson sampling and few-shot learning
- **🏆 Intelligence Ranking** — PageRank + temporal decay + multi-criteria scoring for entity prioritization
- **🔗 Knowledge Graph** — Neo4j-backed entity relationship mapping with GNN link prediction
- **⚡ Real-Time** — WebSocket alerts, Kafka streaming, live dashboard visualization
- **🛠️ 40+ AI Tools** — File I/O, shell execution, web search, LSP, MCP, agent spawning
- **🔌 Extensible** — Plugin system, skill modules, MCP protocol, custom commands

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DISHA PLATFORM                               │
├──────────────────────────┬──────────────────────────────────────────┤
│   CORE CLI ENGINE (TS)   │     AI INTELLIGENCE PLATFORM (PY)       │
│                          │                                          │
│  ┌──────────────────┐    │  ┌────────────────────────────────────┐  │
│  │   Query Engine    │    │  │         Agent Cluster              │  │
│  │  (Claude API +    │    │  │  ┌──────┐ ┌──────┐ ┌──────────┐  │  │
│  │   Tool Loops)     │    │  │  │OSINT │ │Crypto│ │Detection │  │  │
│  └──────┬───────────┘    │  │  └──┬───┘ └──┬───┘ └────┬─────┘  │  │
│         │                │  │     │         │          │         │  │
│  ┌──────▼───────────┐    │  │  ┌──▼─────────▼──────────▼──────┐ │  │
│  │  40+ Tools        │    │  │  │      Orchestrator            │ │  │
│  │  (Bash, Files,    │    │  │  │  (5-Phase Pipeline)          │ │  │
│  │   Web, MCP, LSP)  │    │  │  └──────────┬─────────────────┘ │  │
│  └──────┬───────────┘    │  │              │                    │  │
│         │                │  │  ┌───────────▼────────────────┐   │  │
│  ┌──────▼───────────┐    │  │  │  RL Engine  │  Multimodal  │   │  │
│  │  50+ Commands     │    │  │  │  (PPO +     │  (Vision +   │   │  │
│  │  (Git, Review,    │    │  │  │   Replay)   │   Audio)     │   │  │
│  │   Config, MCP)    │    │  │  └─────────────┴──────────────┘   │  │
│  └──────┬───────────┘    │  │              │                    │  │
│         │                │  │  ┌───────────▼────────────────┐   │  │
│  ┌──────▼───────────┐    │  │  │  Knowledge   │  Prompt     │   │  │
│  │  Terminal UI      │    │  │  │  Graph       │  Optimizer  │   │  │
│  │  (React + Ink)    │    │  │  │  (Neo4j+GNN) │  (Evolving) │   │  │
│  └──────────────────┘    │  │  └─────────────┴──────────────┘   │  │
│                          │  │              │                    │  │
│  ┌──────────────────┐    │  │  ┌───────────▼────────────────┐   │  │
│  │  Bridge (IDE)     │    │  │  │  Intelligence Ranker       │   │  │
│  │  VS Code /        │    │  │  │  (PageRank + Decay)        │   │  │
│  │  JetBrains        │    │  │  └────────────────────────────┘   │  │
│  └──────────────────┘    │  └────────────────────────────────────┘  │
│                          │                                          │
├──────────────────────────┼──────────────────────────────────────────┤
│       Web Dashboard      │         FastAPI Backend                  │
│       (Next.js)          │         (22 Endpoints)                   │
├──────────────────────────┼──────────────────────────────────────────┤
│     Docker / Vercel      │   PostgreSQL│Neo4j│ChromaDB│Kafka       │
└──────────────────────────┴──────────────────────────────────────────┘
```

### Data Flow

```
User Input ──► CLI/API ──► Query Engine ──► Claude API (streaming)
                                │
                          Tool Execution
                         ┌──────┼──────┐
                    Local│   MCP│   Remote│
                   (Bash,│  (External│  (Bridge,│
                   Files)│   Servers)│  Agents) │
                         └──────┼──────┘
                                │
                          Message Processing
                                │
                    ┌───────────┼───────────┐
               Terminal UI    Web Dashboard  IDE Bridge
               (Ink/React)   (Next.js)      (VS Code)
```

---

## 3. Core CLI Engine (TypeScript)

The core engine is a **production-grade AI coding assistant** built on Bun runtime with 207K+ lines of TypeScript. It powers an interactive terminal REPL that orchestrates LLM conversations with tool execution.

### 3.1 Query Engine

**Location:** `src/QueryEngine.ts` (~46K lines)

The heart of the system — processes messages through Claude API with streaming and tool-use loops.

| Feature | Description |
|---------|-------------|
| **Streaming Responses** | Real-time token output from Anthropic API |
| **Tool-Call Loops** | LLM requests tool → execute → feed result → continue |
| **Thinking Mode** | Extended reasoning with thinking budget management |
| **Auto-Retry** | Exponential backoff for transient failures |
| **Token Tracking** | Input/output counts, cost estimation per query |
| **Auto-Compaction** | Summarizes long conversations to fit context window |
| **Context Assembly** | System prompt + user context + tool schemas + memory |

**Execution cycle:**
```
1. Assemble messages (system + conversation + context)
2. Stream to Claude API
3. If tool_use block received:
   a. Check permissions
   b. Execute tool
   c. Append result to messages
   d. Loop back to step 2
4. If text block received:
   a. Render to terminal
   b. Wait for next user input
```

### 3.2 Tool System (40+ Tools)

**Location:** `src/Tool.ts` (~29K lines) + `src/tools/` (40 implementations)

Every tool has: **input schema** (Zod), **permission model**, **execution logic**, **UI renderer**, **concurrency flag**.

#### File System Tools
| Tool | Purpose |
|------|---------|
| `FileReadTool` | Read file contents with line range support |
| `FileWriteTool` | Create/overwrite files |
| `FileEditTool` | Surgical find-and-replace edits |
| `GlobTool` | Pattern-based file discovery |
| `GrepTool` | Regex content search across files |
| `NotebookEditTool` | Jupyter notebook cell editing |

#### Execution Tools
| Tool | Purpose |
|------|---------|
| `BashTool` | Shell command execution with timeout |
| `PowerShellTool` | Windows PowerShell execution |
| `REPLTool` | Interactive REPL sessions |

#### Agent & Coordination Tools
| Tool | Purpose |
|------|---------|
| `AgentTool` | Spawn sub-agents for parallel work |
| `TeamCreateTool` | Create multi-agent teams |
| `TeamDeleteTool` | Disband agent teams |
| `SendMessageTool` | Inter-agent communication |
| `EnterPlanModeTool` | Switch to planning mode |
| `ExitPlanModeTool` | Execute planned actions |
| `VerifyPlanExecutionTool` | Validate plan completion |

#### Web & Search Tools
| Tool | Purpose |
|------|---------|
| `WebFetchTool` | HTTP requests with content extraction |
| `WebSearchTool` | Web search integration |

#### MCP Tools
| Tool | Purpose |
|------|---------|
| `MCPTool` | Invoke Model Context Protocol tools |
| `ListMcpResources` | Discover available MCP resources |
| `ReadMcpResource` | Read MCP resource content |
| `McpAuthTool` | MCP authentication flows |
| `ToolSearchTool` | Search available tools |

#### Task Management
| Tool | Purpose |
|------|---------|
| `TaskCreateTool` | Create background tasks |
| `TaskUpdateTool` | Update task status |
| `TaskGetTool` | Query task state |
| `TaskListTool` | List all tasks |
| `TaskStopTool` | Terminate tasks |

#### Specialized
| Tool | Purpose |
|------|---------|
| `LSPTool` | Language Server Protocol integration |
| `SkillTool` | Execute skill modules |
| `ScheduleCronTool` | Cron-based scheduling |
| `AskUserQuestionTool` | Interactive user prompts |
| `BriefTool` | Concise summaries |

### 3.3 Command System (50+ Commands)

**Location:** `src/commands.ts` (~25K lines) + `src/commands/` (50+ implementations)

#### Git & Code Commands
| Command | Description |
|---------|-------------|
| `/commit` | Stage and commit with AI message |
| `/commit-push-pr` | Full commit → push → PR workflow |
| `/branch` | Branch management |
| `/diff` | Show current changes |
| `/pr_comments` | Review PR comments |
| `/rewind` | Undo recent changes |

#### Code Quality
| Command | Description |
|---------|-------------|
| `/review` | AI code review |
| `/security-review` | Security vulnerability scan |
| `/advisor` | Architecture advice |
| `/bughunter` | Bug detection |

#### Session Management
| Command | Description |
|---------|-------------|
| `/compact` | Compress conversation history |
| `/context` | Show current context |
| `/resume` | Resume previous session |
| `/session` | Session management |
| `/share` | Share session transcript |
| `/export` | Export conversation |

#### Configuration
| Command | Description |
|---------|-------------|
| `/config` | Edit settings |
| `/permissions` | Manage tool permissions |
| `/theme` | UI theme selection |
| `/keybindings` | Key mapping |
| `/vim` | Vim mode toggle |
| `/model` | Switch AI model |

#### Memory & Context
| Command | Description |
|---------|-------------|
| `/memory` | View/edit persistent memory |
| `/add-dir` | Add directory to context |
| `/files` | List tracked files |

#### Integration
| Command | Description |
|---------|-------------|
| `/mcp` | MCP server management |
| `/plugin` | Plugin management |
| `/skills` | Skill discovery |
| `/login` / `/logout` | Authentication |
| `/doctor` | System diagnostics |

### 3.4 Terminal UI (Ink)

**Location:** `src/ink/` + `src/components/` (140+ components)

A custom React-to-terminal rendering engine (fork of Ink):

- **Custom reconciler** — Translates React virtual DOM to terminal escape codes
- **Flex layout** — CSS-like flexbox for terminal positioning
- **140+ components** — Box, Text, Button, Link, Spinner, Input, Table, etc.
- **Event system** — Keyboard, mouse, focus management
- **Color engine** — 256-color + true-color support
- **Screen management** — Multiple screens, overlays, scrolling

### 3.5 Bridge & IDE Integration

**Location:** `src/bridge/` (~300K lines)

Connects the CLI to IDE extensions:

| Feature | Protocol |
|---------|----------|
| **VS Code Extension** | WebSocket + HTTP POST |
| **JetBrains Plugin** | SSE streams + CCR v2 |
| **claude.ai Web** | OAuth tokens + JWT |
| **Session Management** | JWT refresh, trusted devices |

Gated behind `feature('BRIDGE_MODE')` flag.

### 3.6 MCP Protocol

**Location:** `src/services/mcp/`

Acts as both **MCP Client** and **MCP Server**:

| Role | Capability |
|------|-----------|
| **Client** | Connect to external MCP servers, discover tools/resources |
| **Server** | Expose Claude Code tools via MCP protocol |
| **Discovery** | Auto-detect available MCP tools at startup |
| **Auth** | OAuth flows for secure MCP connections |

### 3.7 AI Model Management

**Location:** `src/ai-models/`

| Module | Purpose |
|--------|---------|
| `registry/` | Model discovery, registration, validation, loading |
| `interface/` | Unified API, request adapter, response normalizer, model router |
| `ensemble/` | Multi-model voting, consensus engine, diversity selector, weight calculator |
| `cache/` | Response caching, strategy management, cache invalidation |
| `performance/` | Benchmarking, profiling, leaderboard, metrics collection |
| `monitoring/` | Prometheus metrics, alerting, dashboard, structured logging |
| `updater/` | Auto-update, release listeners, version management, scheduling |

### 3.8 Plugins, Skills & Memory

#### Plugins (`src/plugins/`)
Lifecycle: Discovery → Installation → Loading → Execution → Auto-update

#### Skills (`src/skills/`) — 16 Bundled
| Skill | Purpose |
|-------|---------|
| `batch` | Batch operations |
| `claudeApi` | Direct API calls |
| `debug` | Debugging workflows |
| `loop` | Iterative refinement |
| `remember` | Persist to memory |
| `simplify` | Code simplification |
| `stuck` | Get unstuck |
| `verify` | Correctness verification |

#### Memory (`src/memdir/`)
| Level | Source |
|-------|--------|
| **Project** | `CLAUDE.md` in project root |
| **User** | `~/.claude/CLAUDE.md` |
| **Extracted** | Auto-extracted from conversations |
| **Team** | Shared via `teamMemorySync` |

### 3.9 Multi-Agent Coordinator

**Location:** `src/coordinator/`

Orchestrates parallel agent swarms:
- **Team creation** via `TeamCreateTool`
- **Inter-agent messaging** via `SendMessageTool`
- **Task isolation** per agent
- Gated behind `feature('COORDINATOR_MODE')`

---

## 4. AI Intelligence Platform (Python)

**Location:** `ai-platform/`

A **self-improving threat intelligence system** built on FastAPI with 7 specialized agents, reinforcement learning, and multimodal analysis.

### 4.1 Agent System

**Location:** `ai-platform/backend/app/agents/`

All agents inherit from `BaseAgent`:
```
BaseAgent (Abstract)
├── OSINTAgent          — Open-source intelligence (Shodan, DNS, SpiderFoot)
├── CryptoAgent         — Blockchain analysis (Etherscan, Ethereum)
├── DetectionAgent      — Anomaly detection (Isolation Forest, Z-score)
├── GraphAgent          — Knowledge graph ops (Neo4j, Cypher)
├── ReasoningAgent      — LLM analysis (GPT-4 via LangChain)
├── VisionAgent         — Image intelligence (GPT-4o Vision)
└── AudioAgent          — Audio intelligence (Whisper API)
```

#### OSINTAgent
| Source | Data |
|--------|------|
| **Shodan API** | IPs, ports, vulnerabilities, OS, geolocation |
| **Google DNS** | Domain resolution, A/AAAA records |
| **SpiderFoot** | Comprehensive OSINT framework |
| **Entity extraction** | Hosts, domains, DNS records with risk scoring |

#### CryptoAgent
| Capability | Method |
|-----------|--------|
| **Balance queries** | ETH balance in Wei/ETH |
| **Transaction history** | Last 20 txns with value, gas, timestamps |
| **Token transfers** | ERC-20 token activity tracking |
| **Risk analysis** | Volume-based + large-transfer scoring |
| **Entity extraction** | Wallets + counterparty relationships |

#### DetectionAgent
| Algorithm | Use Case |
|-----------|----------|
| **Isolation Forest** | Primary ML anomaly detection (PyOD) |
| **Z-Score** | Statistical fallback (2.5σ threshold) |
| **Feature extraction** | Automatic numeric field extraction |
| **Output** | Ranked anomalies by severity score |

#### GraphAgent
| Operation | Cypher |
|-----------|--------|
| **Store entities** | `MERGE (e:Entity {id: $id})` |
| **Store relationships** | `CREATE (a)-[:RELATED_TO]->(b)` |
| **Neighbor traversal** | Variable-depth path queries (1..5 hops) |
| **Community detection** | Connected component grouping |

#### ReasoningAgent
| Feature | Detail |
|---------|--------|
| **LLM** | GPT-4 via LangChain |
| **Prompt construction** | Multi-section analysis prompt from all agent data |
| **Risk assessment** | Composite scoring: LOW (0-0.3), MEDIUM (0.3-0.6), HIGH (0.6-0.8), CRITICAL (0.8-1.0) |

#### Orchestrator — 5-Phase Investigation Pipeline
```
Phase 1: DATA COLLECTION
├── OSINT Agent (parallel) ──► Hosts, domains, DNS
└── Crypto Agent (parallel) ──► Wallets, transactions

Phase 2: ANOMALY DETECTION
└── Detection Agent ──► Anomaly scores on all entities

Phase 3: KNOWLEDGE GRAPH
└── Graph Agent ──► Neo4j storage + community detection

Phase 4: LLM REASONING
└── Reasoning Agent ──► GPT-4 threat assessment

Phase 5: COMPILATION
└── Orchestrator ──► Final report (entities, risks, summary)
```

### 4.2 Reinforcement Learning Engine

**Location:** `ai-platform/backend/app/rl/`

A complete RL loop that learns to optimize investigation strategies.

#### Environment (`environment.py`)

| Component | Specification |
|-----------|--------------|
| **State space** | 13 dimensions (entities, relationships, anomalies, risk, depth, agents_used, steps, time) |
| **Action space** | 8 actions (run each of 5 agents, increase/decrease depth, stop) |
| **Max episode length** | 20 steps |
| **Depth range** | 1-5 |
| **Action masking** | Invalid actions filtered based on state |

**Reward function:**
| Signal | Weight |
|--------|--------|
| New entity discovered | +0.1 per entity |
| Anomaly found | +0.5 per anomaly |
| Risk score increase | +2.0 × Δrisk |
| Time penalty | -0.01 × seconds |
| Redundant agent call | -0.2 |
| Exceeded max depth | -0.3 |
| Voluntary stop with data | +completeness bonus |
| Hit max steps | -0.5 |

#### Policy Network (`policy.py`)

| Component | Architecture |
|-----------|-------------|
| **Algorithm** | Proximal Policy Optimization (PPO) |
| **Actor** | MLP: 13 → 64 → 64 → 8 (softmax) |
| **Critic** | MLP: 13 → 64 → 64 → 1 |
| **Optimizer** | Adam (lr=3e-4) |
| **Discount** | γ = 0.99 |
| **Clip ratio** | ε = 0.2 |
| **Entropy coeff** | 0.01 |
| **Grad clipping** | norm = 0.5 |
| **Fallback** | Heuristic sequential agent policy |

#### Reward Computer (`reward.py`)

**Episode-level reward composition:**
| Component | Weight | Source |
|-----------|--------|--------|
| Discovery | 0.30 | Entity count, anomaly count |
| Accuracy | 0.30 | Risk score, feedback TP/FP |
| Efficiency | 0.20 | Step count optimization |
| Feedback | 0.20 | Human rating + actionable findings |

**Feedback inputs:**
- `true_positive` — Was the alert real? (±1.0)
- `user_rating` — 0.0 to 1.0 satisfaction (centered at 0.5)
- `actionable_findings` — Count of actionable items (+0.1 each, max 0.5)

#### Experience Replay (`experience_replay.py`)

| Feature | Value |
|---------|-------|
| **Buffer size** | 10,000 transitions |
| **Sampling** | Prioritized (α=0.6) based on reward magnitude |
| **Priority** | `|reward| + 1e-6` |
| **Episode tracking** | Start/end markers with optional final reward override |
| **Batch format** | NumPy arrays (states, actions, rewards, next_states, dones) |

### 4.3 Multimodal AGI (Vision + Audio)

**Location:** `ai-platform/backend/app/multimodal/`

#### VisionAgent (`vision_agent.py`)

| Analysis Type | Capability |
|--------------|------------|
| **classify** | Content type, objects, IoCs, geographic clues |
| **ocr** | Text extraction, language detection, document classification |
| **detect** | Object bounding boxes, confidence, security relevance |
| **similarity** | Visual embedding (SHA-512 → 128-dim normalized vector) |

**Pipeline:** URL/Base64 → GPT-4o Vision API → Entity extraction → Risk scoring (threat keyword matching)

#### AudioAgent (`audio_agent.py`)

| Capability | Method |
|-----------|--------|
| **Transcription** | OpenAI Whisper API |
| **Language detection** | Automatic from Whisper |
| **Keyword spotting** | 32 threat keywords (malware, ransomware, phishing, bitcoin, tor, etc.) |
| **Threat analysis** | LLM analysis of transcript content |
| **Risk scoring** | Keyword density + high-risk term detection |

#### Multimodal Fusion (`fusion.py`)

| Feature | Algorithm |
|---------|-----------|
| **Entity deduplication** | Label matching across modalities |
| **Cross-modal correlation** | Shared entity detection between modality pairs |
| **Weighted risk** | Text(0.40) + Vision(0.35) + Audio(0.25) |
| **Confidence boost** | 1.2× when multiple modalities confirm threats |
| **Cross-modal confidence** | (modality_coverage + correlation_density) / 2 |

### 4.4 Distributed AGI Cluster

**Location:** `ai-platform/backend/app/collaboration/`

An **AutoGen-style** multi-agent self-collaboration system.

#### Communication Protocol (`protocol.py`)

| Message Type | Purpose |
|-------------|---------|
| `REQUEST` | Ask another agent to perform an action |
| `RESPONSE` | Reply to a request |
| `BROADCAST` | Announce to all agents |
| `DELEGATE` | Hand off a sub-task |
| `CONSENSUS` | Propose or vote on conclusions |
| `FEEDBACK` | Provide quality feedback on outputs |

| Priority | Level |
|----------|-------|
| `LOW` | 0 |
| `NORMAL` | 1 |
| `HIGH` | 2 |
| `CRITICAL` | 3 |

**Features:** Message TTL/expiration, conversation tracking, participant management, pub/sub routing.

#### Cluster Coordinator (`coordinator.py`)

**Collaborative Investigation Pipeline:**
```
Phase 1: BROADCAST
└── Coordinator announces task to all agents

Phase 2: PARALLEL EXECUTION
└── All capable agents run simultaneously (asyncio.gather)

Phase 3: PEER REVIEW
└── Each agent scores other agents' outputs (0.0-1.0)
    Scoring: entities(0.3) + status(0.3) + analysis(0.2) + risk(0.2)

Phase 4: CONSENSUS BUILDING
└── Risk score variance → agreement score
    High variance = low agreement
    Threshold: 60% agreement for consensus

Phase 5: RESULT COMPILATION
└── Merge all entities, anomalies, relationships
    Final risk = weighted average by peer review scores
```

**Cluster monitoring:** Agent status (idle/busy/offline), tasks completed, average response time, capability routing.

### 4.5 Self-Improving Prompts

**Location:** `ai-platform/backend/app/prompts/optimizer.py`

A gradient-free evolutionary prompt optimization engine.

#### Prompt Templates (3 Types)

| Type | Focus |
|------|-------|
| **investigation** | Threat assessment, IoCs, entity connections, recommended actions |
| **risk_assessment** | Risk score justification, attack vectors, vulnerability exposure |
| **pattern_analysis** | Behavioral patterns, hidden connections, temporal patterns, predictions |

#### Evolutionary Optimization

| Mechanism | Algorithm |
|-----------|-----------|
| **Selection** | Thompson sampling (Beta distribution per variant) |
| **Mutation** | Top performer + prefix injection (5 mutation types: specificity, urgency, structure, confidence, context) |
| **Crossover** | Alternating section combination from top 2 parents |
| **Culling** | Remove worst performer when at population capacity |
| **Few-shot injection** | Top 10 successful examples injected into prompts |

**Population:** Up to 5 variants per prompt type, scored by investigation outcomes.

### 4.6 Intelligence Ranking System

**Location:** `ai-platform/backend/app/ranking/intelligence_ranker.py`

#### Composite Score Formula

```
score = threat × 0.30 + impact × 0.25 + confidence × 0.20 + centrality × 0.15 + recency × 0.10
```

| Component | Computation |
|-----------|-------------|
| **Threat** | Risk score from agent analysis |
| **Impact** | Type-based (host=0.6, domain=0.5, wallet=0.7) + risk boost |
| **Confidence** | Multi-source corroboration: 1 source=0.3, 3+ sources=1.0 |
| **Centrality** | PageRank on entity graph (damping=0.85, 20 iterations) |
| **Recency** | Exponential decay with 24-hour half-life: `e^(-0.693 × age / 86400)` |

#### Agent Reliability Tracking

| Metric | Formula |
|--------|---------|
| **Precision** | TP / (TP + FP) |
| **Recall** | TP / (TP + FN) |
| **F1 Score** | 2 × P × R / (P + R) |
| **Reliability** | F1 × 0.8 + speed_factor × 0.2 |
| **Speed factor** | 1 / (1 + avg_time / 60) |

### 4.7 Services Layer

**Location:** `ai-platform/backend/app/services/`

#### Knowledge Graph (Neo4j)
| Operation | Description |
|-----------|-------------|
| `add_entity()` | MERGE node with properties |
| `add_relationship()` | CREATE typed edge with confidence |
| `get_subgraph()` | Variable-depth BFS traversal (1..5 hops) |
| `get_centrality()` | Degree centrality ranking |

#### Vector Store (ChromaDB)
| Operation | Description |
|-----------|-------------|
| `store()` | Add documents with embeddings |
| `query()` | Cosine similarity search |
| `store_investigation()` | Persist investigation summaries |
| `get_context()` | Retrieve relevant context for LLM prompting |

#### Alert Manager (WebSocket)
| Trigger | Alert Level |
|---------|-------------|
| Risk ≥ 0.8 | 🔴 CRITICAL |
| Risk ≥ 0.6 | 🟠 HIGH |
| Anomalies detected | 🟡 MEDIUM |
| Default | 🟢 LOW |

Real-time broadcast to all connected WebSocket clients, in-memory storage (max 1,000 alerts).

#### Kafka Streaming
| Topic | Events |
|-------|--------|
| `intelligence-events` | Investigation results |
| `intelligence-alerts` | Alert broadcasts |

### 4.8 Graph Neural Networks

**Location:** `ai-platform/backend/graph_ai/`

| Model | Architecture | Purpose |
|-------|-------------|---------|
| **GCNEncoder** | 2-layer GCN with ReLU + dropout(0.3) | Node embedding |
| **LinkPredictor** | Concatenated embeddings → MLP → Sigmoid | Edge prediction |
| **GraphClassifier** | GCN → 4-class MLP | Risk classification (LOW/MED/HIGH/CRIT) |

**Training:** Binary cross-entropy loss, negative sampling, Adam optimizer.

**Graph Export:** Neo4j → 16-dim feature matrix (one-hot type + risk + hash features) → PyTorch tensors.

---

## 5. API Reference

**Base URL:** `http://localhost:8000/api/v1`

### Authentication

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/register` | POST | — | Create account → JWT token |
| `/auth/login` | POST | — | Authenticate → JWT token |

### Core Investigation

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/investigate` | POST | ✅ | Single-target investigation (5-phase pipeline) |
| `/multi-investigate` | POST | ✅ | Batch investigation (multiple targets) |
| `/investigate/collaborative` | POST | ✅ | Multi-agent collaborative investigation with consensus |
| `/graph-insights` | POST | ✅ | Graph centrality / subgraph / community queries |
| `/context` | GET | ✅ | Vector memory semantic search |
| `/health` | GET | — | System health status |

### Multimodal Analysis

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/analyze/vision` | POST | ✅ | Image analysis (classify / OCR / detect / similarity) |
| `/analyze/audio` | POST | ✅ | Audio transcription and threat analysis |
| `/analyze/multimodal` | POST | ✅ | Fused text + vision + audio analysis |

### Reinforcement Learning

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/feedback` | POST | ✅ | Submit investigation feedback for RL training |
| `/rl/metrics` | GET | ✅ | Reward tracking + prompt evolution metrics |
| `/rl/evolve-prompts` | POST | ✅ | Trigger one generation of prompt evolution |

### Intelligence Ranking

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/rankings/entities` | POST | ✅ | Ranked entities by composite score |
| `/rankings/agents` | GET | ✅ | Agent reliability leaderboard |
| `/rankings/record-outcome` | POST | ✅ | Record TP/FP for agent tracking |

### Real-Time

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/alerts` | GET | ✅ | Recent alerts (filterable by level) |
| `/cluster/status` | GET | ✅ | Agent cluster health + metrics |
| `/ws/alerts` | WebSocket | — | Live alert stream |

---

## 6. Frontend Dashboard

**Location:** `ai-platform/frontend/` (Next.js + Tailwind CSS)

### Dashboard Tabs

| Tab | Component | Features |
|-----|-----------|----------|
| **Overview** | `StatsPanel` + `AlertsFeed` + `InvestigationPanel` + `GraphVisualization` | Key metrics at a glance |
| **Investigate** | `InvestigationPanel` | Launch investigations, view results |
| **Alerts** | `AlertsFeed` | Real-time alert feed with severity colors |
| **Graph** | `GraphVisualization` | Interactive entity relationship graph |
| **Map** | `MapVisualization` | Geographic threat heatmap |
| **AGI Cluster** | `ClusterPanel` + `RLMetricsPanel` | Agent status, RL metrics |
| **Rankings** | `RankingPanel` | Entity rankings + agent leaderboard |
| **RL System** | `RLMetricsPanel` | RL episodes, rewards, prompt evolution |

### Type System

```typescript
Alert           // level, title, description, entity_id, metadata
Entity          // id, label, entity_type, properties, risk_score
Relationship    // source_id, target_id, type, confidence
Investigation   // entities, relationships, anomalies, risk_score, summary
RankedEntity    // 5-component scores (threat, impact, confidence, centrality, recency)
AgentRanking    // precision, recall, f1_score, avg_time
RLMetrics       // reward metrics + prompt optimization metrics
ClusterStatus   // agent status, capabilities, task counts
```

---

## 7. MCP Server

**Location:** `mcp-server/`

A standalone Model Context Protocol server exposing the codebase for AI-assisted exploration.

### Transport Modes

| Mode | Protocol | Use Case |
|------|----------|----------|
| **STDIO** | stdin/stdout | Claude Desktop, local tools |
| **HTTP** | Streamable HTTP | Vercel, Railway, remote access |
| **SSE** | Server-Sent Events | Legacy compatibility |

### Exposed Capabilities

**8 Tools:** `list_tools`, `list_commands`, `get_tool_source`, `get_command_source`, `read_source_file`, `search_source`, `list_directory`, `get_architecture`

**3 Resources:** `claude-code://architecture`, `claude-code://tools`, `claude-code://commands`

**5 Prompts:** `explain_tool`, `explain_command`, `architecture_overview`, `how_does_it_work`, `compare_tools`

---

## 8. Infrastructure & Deployment

### Docker

```yaml
# Core CLI (Multi-stage)
Stage 1: oven/bun:1-alpine → build
Stage 2: oven/bun:1-alpine → runtime (dist/cli.mjs + git + ripgrep)

# AI Platform
Services:
  - backend (FastAPI, port 8000)
  - frontend (Next.js, port 3001)
  - postgres (port 5432)
  - neo4j (ports 7474, 7687)
  - chromadb (port 8001)
  - kafka (port 9092)
  - zookeeper (port 2181)
```

### Deployment Targets

| Platform | Method |
|----------|--------|
| **Vercel** | Serverless MCP server (`vercel.json` routes) |
| **Railway** | Docker-based MCP server |
| **Docker Compose** | Full platform stack (7 services) |
| **Local** | Bun runtime CLI + Python venv backend |

---

## 9. Tech Stack

### Core CLI Engine

| Component | Technology |
|-----------|-----------|
| **Runtime** | Bun 1.1.0+ |
| **Language** | TypeScript (strict mode, ESNext) |
| **UI Framework** | React 19 + custom Ink (terminal rendering) |
| **CLI Parser** | Commander.js v14 |
| **API Client** | Anthropic SDK v0.87 |
| **Validation** | Zod v4.3 |
| **Linter** | Biome 2.4 |
| **Protocol** | Model Context Protocol SDK v1.29 |
| **Telemetry** | GrowthBook + OpenTelemetry |

### AI Intelligence Platform

| Component | Technology |
|-----------|-----------|
| **Framework** | FastAPI 0.115 + Uvicorn 0.30 |
| **Auth** | python-jose (JWT) + bcrypt |
| **LLM** | LangChain 0.3 + OpenAI GPT-4/4o |
| **Vector DB** | ChromaDB 0.5 |
| **Graph DB** | Neo4j 5.24 |
| **ML** | PyTorch 2.6 + PyTorch Geometric 2.5 |
| **Anomaly Detection** | PyOD 2.0 (Isolation Forest) |
| **Embeddings** | sentence-transformers 3.0 |
| **Streaming** | kafka-python 2.0 |
| **Data** | NumPy 1.26 + Pandas 2.2 + NetworkX 3.3 |

### Frontend

| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 14+ |
| **Styling** | Tailwind CSS |
| **State** | React hooks |
| **Real-time** | WebSocket API |

---

## 10. Project Statistics

| Metric | Value |
|--------|-------|
| **Total source files** | 2,177 |
| **Total lines of code** | 546,425+ |
| **TypeScript/TSX files** | ~2,000 |
| **Python files** | ~60 |
| **React components** | 140+ |
| **AI tools** | 40+ |
| **CLI commands** | 50+ |
| **API endpoints** | 22 |
| **Intelligence agents** | 7 |
| **RL state dimensions** | 13 |
| **RL action space** | 8 |
| **Prompt variants** | 3 types × 5 population |
| **Threat keywords** | 32+ |
| **Docker services** | 7 |
| **Documentation files** | 25+ |
| **Build prompts** | 16 guided steps |

---

## 11. Getting Started

### Quick Start — CLI Engine

```bash
# Install Bun runtime
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Create runtime shims (follow prompts/02-runtime-shims.md)
# Build
bun run build

# Configure
cp .env.example .env
# Add ANTHROPIC_API_KEY=sk-ant-...

# Run
bun run dev
```

### Quick Start — AI Platform

```bash
cd ai-platform

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add: OPENAI_API_KEY, NEO4J_URI, SHODAN_API_KEY, ETHERSCAN_API_KEY
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd ../frontend
npm install
npm run dev
```

### Quick Start — Full Stack (Docker)

```bash
cd ai-platform/docker
docker-compose up -d
# Backend: http://localhost:8000
# Frontend: http://localhost:3001
# Neo4j Browser: http://localhost:7474
```

### Verification

```bash
# TypeScript
bun run typecheck    # Type checking
bun run lint         # Biome linting

# API
curl http://localhost:8000/api/v1/health

# MCP Server
cd mcp-server && npm install && npm run build
node dist/index.js  # STDIO mode
```

---

## 12. Contributing

### Architecture Principles

1. **Modular design** — Each subsystem is independently testable
2. **Abstract base classes** — All agents inherit from `BaseAgent`
3. **Async-first** — All I/O operations are async/await
4. **Feature flags** — New features gated behind environment flags
5. **Structured logging** — `structlog` (Python) / OpenTelemetry (TS)
6. **Schema validation** — Pydantic (Python) / Zod (TypeScript)

### How to Add a New Agent

```python
# 1. Create ai-platform/backend/app/agents/my_agent.py
from app.agents.base_agent import BaseAgent

class MyAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="MyAgent", description="Does X")

    async def execute(self, target: str, context: dict = None) -> dict:
        # Your logic here
        return {"entities": [...], "risk_score": 0.5}

# 2. Register in orchestrator.py or coordinator.py
# 3. Add endpoint in endpoints.py
# 4. Add frontend component if needed
```

### How to Add a New Tool

```typescript
// 1. Create src/tools/MyTool.ts implementing Tool interface
// 2. Register in src/tools.ts
// 3. Define input schema with Zod
// 4. Add permission rules
```

### PR Guidelines

1. Create a feature branch
2. Keep PR scope focused (one feature per PR)
3. Add type annotations for all new code
4. Update documentation for new modules
5. Test locally before submitting

---

<p align="center">
  <b>Disha</b> — A self-learning, distributed, multimodal AGI platform for intelligent threat analysis and AI-powered development.
  <br>
  <sub>2,177 files · 546K+ lines · 7 agents · 40+ tools · 50+ commands · Self-improving RL loop</sub>
</p>
