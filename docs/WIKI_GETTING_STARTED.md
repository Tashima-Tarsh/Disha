# Getting Started with DishaOS

Welcome to the Sovereign Intelligence Platform. This guide will walk you through the elite configuration of your environment.

## ⚙️ Prerequisites
- **Python 3.11+**: The core intelligence language.
- **Bun 1.1+**: High-speed JavaScript runtime for the frontend.
- **Docker**: For isolated service orchestration.
- **Neo4j / Redis**: Required for the memory mesh.

---

## 🛠️ Installation

### 1. Clone & Initialize
```bash
git clone https://github.com/Tashima-Tarsh/Disha.git
cd Disha
```

### 2. Backend Setup (uv)
We use `uv` for extreme dependency resolution speed.
```bash
cd disha-agi-brain/backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd disha/apps/web
bun install
```

---

## 🔧 Configuration
Copy the `.env.example` files to `.env` in the following locations:
- `disha/apps/web/.env`
- `disha/services/ai-platform/backend/.env`
- `disha-agi-brain/backend/.env`

### Key Variables
| Variable | Description |
| :--- | :--- |
| `DISHA_MODEL_PROVIDER` | `openai`, `anthropic`, or `mock` for local testing. |
| `NEO4J_URI` | Connection string for the Semantic Knowledge Graph. |
| `REDIS_URL` | Ephemeral memory store for Go4Bid. |
| `TAVILY_API_KEY` | Required for autonomous web research agent. |

---

## 🏃 Running Locally

### Development Mode
```bash
# Terminal 1: Backend
python disha/services/ai-platform/backend/main.py

# Terminal 2: Frontend
cd disha/apps/web && bun run dev
```

### Production Mode (Docker)
```bash
docker-compose up --build
```
