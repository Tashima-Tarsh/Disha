# 🛡️ Disha — Self-learning Multi-Agent AGI Platform

<p>
  <img>
</p>

<p>
  <strong>Direction (दिशा)</strong> — A production-grade, multi-agent platform combining an AI coding assistant, OSINT &amp; cyber-defense tooling, RL-driven investigators, and a realtime dashboard.
</p>

<p>
  <a><img src="https://img.shields.io/badge/Quick--Start-Run%20Locally-brightgreen?style=flat-square"></a>
  <img src="https://img.shields.io/badge/License-MIT-lightgrey?style=flat-square">
  <img src="https://img.shields.io/badge/Agents-7-orange?style=flat-square">
  <img src="https://img.shields.io/badge/Tools-40+-red?style=flat-square">
  <img src="https://img.shields.io/badge/Docker-Ready-blue?style=flat-square">
</p>

---

## Table of Contents
- <a>Why Disha</a>
- <a>Features</a>
- <a>Quick Start</a>
- <a>Full Installation</a>
- <a>Architecture &amp; Docs</a>
- <a>Contributing</a>
- <a>License</a>

---

## Why Disha
A single codebase combining a CLI coding assistant, a multi-agent intelligence platform (OSINT, Crypto, Detection, Graph, Reasoning, Vision, Audio), and a virtual cyber-defense honeypot &amp; visualization dashboard. Built to be self-hostable, extensible, and oriented toward blue-team research and education.

## Features
A concise overview of Disha's core capabilities:

- Multi-agent AI: 7 specialist agents with an orchestrator and reasoning pipeline.
- Cyber Defense: Cowrie/Dionaea/OpenCanary honeypots + AI detection and simulated responses.
- CLI Assistant: Bun + TypeScript CLI with 40+ tools and IDE bridge.
- Reinforcement Learning: PPO engine optimizing investigation strategies.
- Multimodal: Vision (LLaVA/GPT-4o), Audio (Whisper), Text (LLMs).
- Web Dashboard: Next.js + Tailwind + real-time alerts, maps, graphs.

## Quick Start
Run the full stack locally using Docker Compose (recommended):

```bash
# Start core services (backend, frontend, Neo4j, ChromaDB)
cd ai-platform/docker
docker compose up -d
# Backend: http://localhost:8000
# Frontend: http://localhost:3001
```

If you prefer specific subsystems see <a>Full Installation</a>.

## Full Installation
Detailed installation options (CLI engine, AI platform, Cyber defense, Historical strategy) remain in their respective folders. See:

- `ai-platform/README.md` — AI Intelligence Platform
- `cyber-defense/README.md` — Virtual Cyber Defense
- `historical-strategy/README.md` — Historical Strategy Intelligence

## Architecture &amp; Docs
High-level architecture and detailed system documents live under `/docs` and each subsystem README. See:

- `docs/architecture.md`
- `docs/tools.md`
- `WIKI.md`

## Troubleshooting &amp; Quick Commands
- Start CLI (dev): `bun run dev`
- Start AI backend (local): `uvicorn app.main:app --reload --port 8000`
- Start honeypots (docker): `cd cyber-defense && docker compose up -d`

## Contributing
1. Fork the repo and create a branch from `main`.
2. Keep PR scope focused and add tests where appropriate.
3. Update docs for any public-facing changes.

## License
MIT — see <a>LICENSE</a>
