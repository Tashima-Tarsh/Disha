# Disha — Usage Guide

## Table of Contents
1. [Installation & Setup](#installation--setup)
2. [CLI Usage](#cli-usage)
3. [AI Intelligence Platform](#ai-intelligence-platform)
4. [Decision Engine](#decision-engine)
5. [Historical Strategy Module](#historical-strategy-module)
6. [Cyber Defense System](#cyber-defense-system)
7. [MCP Server Integration](#mcp-server-integration)
8. [Web Dashboard](#web-dashboard)
9. [Training AI Models](#training-ai-models)
10. [Continuous Learning](#continuous-learning)
11. [Sentinel Monitoring](#sentinel-monitoring)
12. [Configuration](#configuration)
13. [Troubleshooting](#troubleshooting)

## Installation & Setup

### Prerequisites

- **Bun** 1.1+ (CLI runtime)
- **Node.js** 18+ (MCP server, web dashboard)
- **Python** 3.11+ (AI platform, decision engine, cyber defense)
- **Docker** (optional, for full stack)

### Clone and Install

```bash
git clone https://github.com/Tashima-Tarsh/Disha.git
cd Disha
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```bash
# .env
ANTHROPIC_API_KEY=your_anthropic_key     # For Claude LLM
OPENAI_API_KEY=your_openai_key           # For GPT-4o (optional)
NEO4J_URI=bolt://localhost:7687          # Graph DB (optional)
NEO4J_PASSWORD=your_password             # Graph DB (optional)
```

> **Note:** Disha works with mock providers and open-source APIs — no paid keys required for core functionality.

## CLI Usage

The Disha CLI is built with Bun + TypeScript + React/Ink:

```bash
# Start the CLI
bun run src/entrypoints/cli.tsx

# List available tools
bun run src/entrypoints/cli.tsx --tools

# List available commands
bun run src/entrypoints/cli.tsx --commands
```

## AI Intelligence Platform

The AI platform runs 7 specialized agents orchestrated via FastAPI:

```bash
cd ai-platform/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/investigate` | POST | Launch multi-agent investigation |
| `/api/v1/agents/osint` | POST | OSINT data collection |
| `/api/v1/agents/crypto` | POST | Blockchain analysis |
| `/api/v1/agents/detection` | POST | Anomaly detection |
| `/api/v1/agents/graph` | POST | Knowledge graph queries |
| `/api/v1/agents/reasoning` | POST | LLM-powered reasoning |
| `/api/v1/multimodal/vision` | POST | Image analysis |
| `/api/v1/multimodal/audio` | POST | Audio transcription |

## Decision Engine

Multi-agent reasoning with political, legal, ideological, and security analysis:

```bash
cd decision-engine
pip install -r requirements.txt

# Run with mock LLM (no model download needed)
DISHA_MODEL_PROVIDER=mock python main_decision_engine.py

# Run tests
DISHA_MODEL_PROVIDER=mock python -m pytest tests/ -v
```

### Optional: FAISS Retrieval

```bash
pip install faiss-cpu sentence-transformers
```

### Optional: Local LLM

```bash
pip install llama-cpp-python
export DISHA_MODEL_PROVIDER=llamacpp
export DISHA_MODEL_PATH=/path/to/model.gguf
```

## Historical Strategy Module

AI classifier and simulation engine for 32+ historical conflicts:

```bash
cd historical-strategy
pip install -r requirements.txt

# Start the API server
uvicorn api.main:app --reload --port 8001

# Train the classifier
python model/train.py

# Run a simulation
python simulation/engine.py
```

## Cyber Defense System

AI-powered honeypot stack with threat classification:

```bash
# Using Docker (recommended)
cd cyber-defense
docker-compose up -d

# Train the threat classifier
cd model
pip install torch --index-url https://download.pytorch.org/whl/cpu
python train.py
```

## MCP Server Integration

The Model Context Protocol server exposes Disha's tools for AI assistants:

```bash
cd mcp-server
npm install
npm run dev    # Development mode
npm run build  # Build for production
npm start      # Production mode
```

**Live deployment:** [disha.vercel.app](https://disha.vercel.app/health)

## Web Dashboard

Next.js dashboard for threat intelligence visualization:

```bash
cd web
npm install
npm run dev    # http://localhost:3000
```

## Training AI Models

### Train All Components

```bash
python scripts/train_all.py
```

### Individual Training

```bash
# Reinforcement Learning (PPO)
cd ai-platform/backend && python -m app.rl.train

# Graph Neural Networks
cd ai-platform/backend && python graph_ai/train.py

# Decision Engine
cd decision-engine && DISHA_MODEL_PROVIDER=mock python train.py
```

## Continuous Learning

Disha supports continuous self-improvement:

```bash
# Offline mode (synthetic data)
python scripts/continuous_train.py --rounds 3 --offline

# Online mode (fetches from abuse.ch, arXiv, OEIS)
python scripts/continuous_train.py --rounds 3

# Single component
python scripts/continuous_train.py --rounds 3 --component rl
```

## Sentinel Monitoring

Real-time threat monitoring and self-healing:

```bash
# Run the full sentinel system
python scripts/sentinel/guardian.py

# Run tests
python -m pytest scripts/sentinel/test_sentinel.py -v
```

## Configuration

### Biome (TypeScript Linting)

```bash
npx biome check src/                         # Check
npx biome check --write src/                  # Safe fixes
npx biome check --write --unsafe src/         # All auto-fixes
```

### Python Linting

```bash
flake8 ai-platform/backend/ --max-line-length=120 --ignore=E501,W503,W504
flake8 decision-engine/ --max-line-length=120 --ignore=E501,W503,W504
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `bun` command not found | Install Bun: `curl -fsSL https://bun.sh/install \| bash` |
| Python import errors | Ensure you're in the correct subdirectory and have installed requirements |
| PyTorch not found | Install CPU-only: `pip install torch --index-url https://download.pytorch.org/whl/cpu` |
| Neo4j connection refused | Start Neo4j or set `NEO4J_URI` environment variable |
| FAISS not available | Install: `pip install faiss-cpu` (optional dependency) |
| TypeScript errors | Some SDK types are generated at build time — run `bun run build` first |

---

> **Full documentation:** [WIKI.md](./WIKI.md) · [Architecture](./docs/architecture.md) · [LEARNING_LOG.md](./LEARNING_LOG.md)