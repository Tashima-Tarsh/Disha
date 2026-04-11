# Quantum Physics Layer — Layer 6 of Disha AGI

> ⚛ Quantum mechanics, space science, physics timeline, suppressed theories, and unified field theory — all powered by a FastAPI + Next.js stack.

## Architecture

```
quantum-physics/
├── backend/
│   ├── api/
│   │   └── main.py           ← FastAPI app (port 8002)
│   ├── engines/
│   │   ├── quantum_engine.py      ← Qiskit / numpy quantum simulator
│   │   ├── physics_classifier.py  ← TF-IDF + LR domain classifier
│   │   ├── space_engine.py        ← NASA APIs + Kepler orbit sim
│   │   ├── suppressed_physics.py  ← Fringe theory catalog & analyzer
│   │   └── unified_field.py       ← Force unification modeler
│   └── knowledge/
│       ├── classical_physics.json
│       ├── modern_physics.json
│       ├── ancient_physics.json
│       ├── quantum_physics.json
│       ├── space_science.json
│       └── suppressed_physics.json
└── frontend/
    ├── pages/
    │   ├── index.tsx           ← Dashboard (port 3003)
    │   ├── quantum.tsx         ← Circuit Laboratory
    │   ├── physics-timeline.tsx
    │   ├── space.tsx
    │   └── suppressed.tsx
    └── components/
        ├── CircuitVisualizer.tsx
        ├── PhysicsClassifier.tsx
        ├── OrbitalSimulator.tsx
        └── UnifiedFieldMap.tsx
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/physics/domains` | All physics domains |
| GET | `/api/physics/timeline` | Chronological discoveries |
| POST | `/api/physics/classify` | Classify physics text → domain |
| POST | `/api/quantum/simulate` | Run quantum circuit |
| GET | `/api/quantum/algorithms` | List quantum algorithms |
| POST | `/api/quantum/entangle` | Create GHZ entangled state |
| GET | `/api/quantum/bell` | Bell state experiment |
| GET | `/api/space/apod` | NASA Astronomy Picture of the Day |
| GET | `/api/space/neo` | Near Earth Objects feed |
| POST | `/api/space/orbit` | Compute Keplerian orbit trajectory |
| GET | `/api/space/solar-system` | Solar system planet data |
| GET | `/api/suppressed/theories` | All suppressed/fringe theories |
| POST | `/api/suppressed/analyze` | Analyze text against known theories |
| GET | `/api/unified/forces` | 4 fundamental forces |
| GET | `/api/unified/history` | Force unification history |
| POST | `/api/unified/model` | Predict unification at energy scale |

## Quick Start

### Backend (standalone)

```bash
cd quantum-physics/backend
pip install fastapi uvicorn numpy scikit-learn httpx python-dotenv
uvicorn api.main:app --host 0.0.0.0 --port 8002 --reload
```

### Frontend (standalone)

```bash
cd quantum-physics/frontend
npm install
npm run dev   # starts on port 3003
```

### Docker Compose

```bash
cd quantum-physics
cp .env.example .env
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Backend API | http://localhost:8002 |
| Frontend | http://localhost:3003 |
| API Docs | http://localhost:8002/docs |

## Integration with Disha AI Platform

The `quantum-physics` backend is also registered in `ai-platform/docker/docker-compose.yml` as the `quantum-physics` service on the `intelligence-net` network.

The `ai-platform` frontend exposes a **Quantum Physics** tab in the sidebar (accessible from the Disha dashboard at http://localhost:3001), which embeds the `QuantumPhysicsPanel` component.

CLI access:

```bash
disha quantum status        # Check if backend is online
disha quantum simulate      # Run Bell state simulation
disha quantum classify      # Classify a physics description
disha quantum space         # Fetch NASA APOD
```

## Knowledge Domains

| Domain | Period | Color |
|--------|--------|-------|
| Classical Physics | -400 to 1905 | Cyan |
| Modern Physics | 1900–present | Green |
| Quantum Physics | 1925–present | Purple |
| Space Science | Ancient–present | Blue |
| Ancient & Traditional | -3000 to 1500 | Yellow |
| Suppressed & Fringe | 19th c.–present | Pink |

> ⚠ **Disclaimer:** Suppressed/fringe theories are presented for educational and research purposes only. Confidence scores reflect scientific consensus.
