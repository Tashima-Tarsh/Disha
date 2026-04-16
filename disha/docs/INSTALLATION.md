# Installation Guide

This guide provides step-by-step instructions for setting up the **DISHA Sovereign Intelligence Platform** in various environments.

## 📋 Prerequisites

Before you begin, ensure your hardware and software meet the following requirements:

- **OS**: Linux (Ubuntu 22.04+ recommended), macOS 13+, or Windows 11 (WSL2).
- **RAM**: 16GB minimum (32GB+ for large graph simulations).
- **GPU**: NVIDIA GPU (8GB+ VRAM) recommended for Physics and GNN modules.
- **Tools**:
  - [Bun](https://bun.sh/) ≥ 1.2.0
  - [Python](https://python.org) ≥ 3.12
  - [Docker](https://docker.com) + Docker Compose
  - [Git](https://git-scm.com)

---

## 🚀 Standard Installation

### 1. Clone & Initialize
```bash
git clone https://github.com/Tashima-Tarsh/Disha.git
cd Disha
bun install
```

### 2. Python Environment
We recommend using a virtual environment for the intelligence services:
```bash
cd disha/services/ai-platform/backend
python -m venv venv
source venv/bin/activate  # Or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### 3. Database Layer
The easiest way to launch the memory layer is via Docker:
```bash
cd disha/infra/docker
docker compose up -d
```
*This will start Neo4j, ChromaDB, and Kafka instances.*

---

## 🏠 Environment Setup

Copy the example environment files and fill in your API keys (Anthropic, OpenAI, etc.):
```bash
cp .env.example .env
# Fill in keys in .env
```

---

## 🛠️ Verification Build

To ensure everything is connected correctly, run the unified build:
```bash
bun run build
bun run check
```

---

## 🆘 Troubleshooting
- **ModuleNotFoundError**: Ensure `PYTHONPATH` includes the root directory.
- **Neo4j Connection**: Verify the default password has been updated in `.env`.
- **Bun version**: Run `bun --version` to ensure you are on `1.2.0` or higher.
