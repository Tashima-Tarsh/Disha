# AI Intelligence Platform

The DISHA Intelligence Platform is a multi-agent cluster designed for high-confidence forensic and strategic analysis.

## 🤖 Agent Cluster

DISHA orchestrates 7 specialized agents, all inheriting from a unified `BaseAgent` class:

- **OSINT Agent**: Real-time ingestion from HackerTarget, ip-api, and passive DNS.
- **Crypto Agent**: Blockchain analysis (wallet tracking, gas spike detection).
- **Detection Agent**: Statistical anomaly detection (Isolation Forest, Z-score).
- **Graph Agent**: Knowledge graph navigation and community detection.
- **Reasoning Agent**: LLM-driven strategic analysis and risk assessment.
- **Vision Agent**: GPT-4o-V / LLaVA powered image/signal classification.
- **Audio Agent**: Whisper-powered transcription and threat keyword spotting.

---

## 📈 Reinforcement Learning (RL)

The platform uses **PPO (Proximal Policy Optimization)** to learn the best investigation strategies.
- **State Space**: 13 dimensions including entity count, risk magnitude, and time depth.
- **Reward Function**: Positive rewards for new IoC discovery; penalties for redundant agent calls or slow response times.
- **Continuous Training**: The `continuous_train.py` script pulls from the `experience_replay` buffer to fine-tune the investigation policy weekly.

---

## 📊 Intelligence Ranking

DISHA implements a **Composite Priority Scoring** algorithm to rank targets:
```text
Score = (Threat × 0.3) + (Impact × 0.25) + (Confidence × 0.2) + (Centrality × 0.15) + (Recency × 0.1)
```
- **Centrality** is calculated via PageRank on the Neo4j Knowledge Graph.
- **Recency** uses exponential decay to prioritize recent threats.
