# DishaOS: Technical Guides

## 🎨 Frontend Guide (Next.js 15)
The DISHA frontend is built for **Observability**.
- **Directory:** `disha/apps/web/`
- **Core Component:** `JarvisCommandCenter.tsx`
- **Theme:** Dark Luxury Cybernetics. Use the CSS variables in `globals.css` to maintain brand integrity.
- **WebSocket:** Connects to `ws://localhost:8000/api/v1/osint-stream/ws` for live threat visualization.

---

## 🧠 Backend Guide (FastAPI)
The backend is an **Agentic Orchestrator**.
- **Directory:** `disha/services/ai-platform/backend/`
- **Logic:** `cognitive_loop.py`
- **Agent Addition:** To add a new agent, register it in `disha/ai/core/agents/` and add its cross-examination logic to the `DecisionNexus`.
- **RAG:** Use the `CodeChunker` in `disha-agi-brain/` to ingest new repository logic.

---

## 🛡️ Security Model
- **SAST:** Every push is audited by `Bandit` (Python) and `Biome` (TS).
- **Secret Scanning:** `Gitleaks` prevents private key leaks.
- **Honeypot Integration:** The `Sentinel` agent listens for signals from dockerized Cowrie/Dionaea instances.

---

## 🚀 Deployment & Monitoring
- **Deployment:** Standardized Docker images are provided in the root `Dockerfile`.
- **Monitoring:** Integrated `structlog` for JSON logging and OpenTelemetry for trace tracking.
- **Self-Healing:** Ensure `disha_mythos.py` is configured as a cron job to monitor and repair cluster health daily.
