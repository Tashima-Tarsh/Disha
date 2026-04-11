[← Back to main README](../README.md)

# 🛡️ AI Intelligence Platform

A production-grade, multi-agent AI system for intelligence gathering, cybersecurity analysis, blockchain tracking, and real-time threat detection.

## Table of Contents
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │Dashboard │ │ Alerts   │ │  Graph   │ │  Threat Map   │  │
│  │  Panel   │ │  Feed    │ │  Viewer  │ │  (Heatmap)    │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API + WebSocket
┌────────────────────┴────────────────────────────────────────┐
│                 Backend (FastAPI)                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Agent Orchestrator                       │    │
│  │  ┌─────┐ ┌──────┐ ┌─────────┐ ┌─────┐ ┌─────────┐ │    │
│  │  │OSINT│ │Crypto│ │Detection│ │Graph│ │Reasoning│ │    │
│  │  │Agent│ │Agent │ │ Agent   │ │Agent│ │ Agent   │ │    │
│  │  └─────┘ └──────┘ └─────────┘ └─────┘ └─────────┘ │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Memory   │ │Knowledge │ │ Kafka    │ │   Alert      │   │
│  │(ChromaDB)│ │Graph(Neo)│ │Streaming │ │  Manager     │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Graph AI (GNN + PyTorch)                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- API keys (optional but recommended):
  - OpenAI API key (for LLM reasoning)
  - Shodan API key (for OSINT)
  - Etherscan API key (for blockchain)

### 1. Clone and Configure

```bash
cd ai-platform

# Copy environment files
cp docker/.env.example docker/.env
cp backend/.env.example backend/.env

# Edit with your API keys
nano docker/.env
```

### 2. Launch with Docker Compose

```bash
cd docker
docker compose up -d
```

This starts all services:

| Service    | Port  | Description               |
|-----------|-------|---------------------------|
| Backend   | 8000  | FastAPI REST API           |
| Frontend  | 3001  | Next.js Dashboard          |
| PostgreSQL| 5432  | Structured data storage    |
| Neo4j     | 7474/7687 | Knowledge graph        |
| ChromaDB  | 8001  | Vector embeddings          |
| Kafka     | 9092  | Event streaming            |

### 3. Access the Platform

- **Dashboard**: http://localhost:3001
- **API Docs**: http://localhost:8000/docs
- **Neo4j Browser**: http://localhost:7474

## 📁 Project Structure

```
ai-platform/
├── backend/
│   ├── app/
│   │   ├── agents/          # Multi-agent system
│   │   │   ├── base_agent.py
│   │   │   ├── osint_agent.py
│   │   │   ├── crypto_agent.py
│   │   │   ├── detection_agent.py
│   │   │   ├── graph_agent.py
│   │   │   ├── reasoning_agent.py
│   │   │   └── orchestrator.py
│   │   ├── api/v1/          # API endpoints
│   │   │   └── endpoints.py
│   │   ├── core/            # Config, auth, logging
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── logging.py
│   │   ├── models/          # Pydantic schemas
│   │   │   └── schemas.py
│   │   ├── services/        # Business logic
│   │   │   ├── memory/      # ChromaDB vector store
│   │   │   ├── graph/       # Neo4j knowledge graph
│   │   │   ├── streaming/   # Kafka producer/consumer
│   │   │   └── alerts/      # WebSocket alert system
│   │   └── main.py          # FastAPI app entry point
│   ├── graph_ai/            # GNN models & training
│   │   ├── models.py
│   │   ├── trainer.py
│   │   └── graph_exporter.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/                 # Next.js app router
│   │   ├── dashboard/       # Main dashboard page
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/          # React components
│   │   ├── alerts/          # Alert feed
│   │   ├── graph/           # Graph visualization
│   │   ├── map/             # Threat heatmap
│   │   └── layout/          # Sidebar, panels
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # API client, types
│   └── package.json
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── docker-compose.yml
│   └── .env.example
└── README.md
```

## 🔌 API Reference

### Authentication

```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "analyst@example.com", "password": "secure123"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "analyst@example.com", "password": "secure123"}'
```

### Investigation

```bash
# Single target investigation
curl -X POST http://localhost:8000/api/v1/investigate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"target": "192.168.1.1", "investigation_type": "full", "depth": 2}'

# Multi-target investigation
curl -X POST http://localhost:8000/api/v1/multi-investigate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"targets": ["192.168.1.1", "example.com"], "investigation_type": "osint"}'
```

### Graph Insights

```bash
# Get centrality analysis
curl -X POST http://localhost:8000/api/v1/graph-insights \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"insight_type": "centrality", "limit": 10}'
```

### Alerts

```bash
# Get recent alerts
curl http://localhost:8000/api/v1/alerts?limit=20 \
  -H "Authorization: Bearer <token>"
```

### WebSocket (Real-time Alerts)

```javascript
const ws = new WebSocket("ws://localhost:8000/api/v1/ws/alerts");
ws.onmessage = (event) => {
  const alert = JSON.parse(event.data);
  console.log("New alert:", alert);
};
```

## 🧠 Multi-Agent System

| Agent | Role | Data Sources |
|-------|------|-------------|
| **OSINT Agent** | Open-source intelligence | Shodan, DNS, SpiderFoot |
| **Crypto Agent** | Blockchain analysis | Etherscan, Alchemy |
| **Detection Agent** | Anomaly detection | PyOD (Isolation Forest) |
| **Graph Agent** | Knowledge graph ops | Neo4j |
| **Reasoning Agent** | AI analysis & reports | OpenAI GPT-4 |

### Investigation Pipeline

1. **Data Collection** - OSINT and Crypto agents gather data in parallel
2. **Anomaly Detection** - Detection agent analyzes collected entities
3. **Knowledge Graph** - Graph agent stores entities and relationships
4. **AI Analysis** - Reasoning agent generates threat assessment
5. **Alert Generation** - System creates alerts for high-risk findings

## 🧪 Development Setup

### Backend (without Docker)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings
uvicorn app.main:app --reload --port 8000
```

### Frontend (without Docker)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## ⚙️ Configuration

All configuration is done via environment variables. See `.env.example` files for full list.

### Required for Full Functionality

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for LLM reasoning |
| `SECRET_KEY` | JWT signing secret (change in production!) |

### Optional API Keys

| Variable | Description |
|----------|-------------|
| `SHODAN_API_KEY` | Shodan API for host intelligence |
| `ETHERSCAN_API_KEY` | Etherscan API for blockchain data |
| `ALCHEMY_API_KEY` | Alchemy API for Web3 data |
| `SPIDERFOOT_API_KEY` | SpiderFoot for OSINT |

## 🔒 Security

- JWT-based authentication with configurable expiration
- Multi-tenant support via user_id isolation
- Environment variables for all secrets
- CORS configuration for frontend access
- Input validation via Pydantic schemas

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details.
