# ⚔️ Historical Strategy Intelligence System

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4-orange.svg)](https://scikit-learn.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An AI-powered historical military strategy analysis platform that classifies, simulates, and visualizes over 30 historical conflicts spanning 2,500+ years of warfare — from the Battle of Marathon to the Gulf War.

---

## 🏗️ Architecture

```
historical-strategy/
│
├── 📊 data/                     # Data layer
│   ├── historical_data.json     # 30+ historical conflicts (rich JSON)
│   └── pipeline.py              # ML preprocessing pipeline
│
├── 🤖 model/                    # Machine learning layer
│   ├── classifier.py            # RandomForest + Recommender classes
│   ├── train.py                 # Training script (RF + MLP)
│   └── evaluate.py              # Evaluation utilities
│
├── ⚙️ simulation/               # Simulation engine
│   ├── engine.py                # HistoricalSimulationEngine
│   └── scenarios.py             # Predefined scenarios + effectiveness matrices
│
├── 🌐 api/                      # REST API layer
│   └── main.py                  # FastAPI application (10+ endpoints)
│
├── 🖥️ dashboard/                # Frontend
│   ├── pages/
│   │   ├── _app.js
│   │   └── index.js             # Main dashboard (5 tabs)
│   ├── components/
│   │   ├── Timeline.js          # Chronological conflict timeline
│   │   ├── ConflictMap.js       # Interactive world map (Leaflet)
│   │   ├── StrategyComparison.js # Side-by-side strategy comparison
│   │   ├── SimulationPanel.js   # Battle simulation interface
│   │   └── StatsPanel.js        # Statistics charts (Recharts)
│   └── styles/globals.css       # Dark cyberpunk theme
│
├── 🐳 docker/                   # Docker files
│   ├── Dockerfile.api
│   └── Dockerfile.dashboard
│
├── docker-compose.yml
├── requirements.txt
└── README.md
```

---

## ✨ Features

- **30+ Historical Conflicts** — Ancient to Contemporary, richly annotated with tactics, lessons, leaders
- **Strategy Classifier** — RandomForestClassifier + MLPClassifier trained on historical patterns
- **Battle Simulator** — Probabilistic outcome engine with terrain, force ratio, morale, weather factors
- **Interactive Timeline** — Chronological, filterable by era, expandable conflict cards
- **Global Conflict Map** — React-Leaflet world map with strategy-colored markers
- **Strategy Comparison** — Radar charts, bar charts, head-to-head effectiveness analysis
- **REST API** — 10+ FastAPI endpoints with OpenAPI docs
- **Dark Cyberpunk UI** — Glassmorphism, neon accents, animated charts
- **Docker Ready** — Full docker-compose setup for API + dashboard

---

## 🚀 Quick Start

### Local Development

**1. Start the API**

```bash
cd historical-strategy

# Install Python dependencies
pip install -r requirements.txt

# (Optional) Run the ML pipeline to process data
python data/pipeline.py

# (Optional) Train the classifier
python model/train.py

# Start the API server
uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload
```

API available at: http://localhost:8001  
Interactive docs: http://localhost:8001/docs

**2. Start the Dashboard**

```bash
cd historical-strategy/dashboard

# Install Node dependencies
npm install

# Start dev server
npm run dev
```

Dashboard available at: http://localhost:3002

### Docker Compose

```bash
cd historical-strategy
docker-compose up --build
```

Services:
- API: http://localhost:8001
- Dashboard: http://localhost:3002

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check and system info |
| GET | `/api/conflicts` | List all conflicts (filterable) |
| GET | `/api/conflicts/{id}` | Get specific conflict by ID |
| GET | `/api/stats` | Aggregate statistics and analytics |
| GET | `/api/strategies` | All strategy types with descriptions |
| GET | `/api/timeline` | Conflicts sorted chronologically |
| GET | `/api/eras` | Eras with conflict counts |
| GET | `/api/leaders` | Notable leaders with their conflicts |
| GET | `/api/scenarios` | Predefined simulation scenarios |
| POST | `/api/simulate` | Run a battle simulation |
| POST | `/api/analyze` | Strategy recommendations for a scenario |
| POST | `/api/compare` | Compare two strategies head-to-head |

### Simulation Request Body

```json
{
  "attacker_strategy": "Blitzkrieg",
  "defender_strategy": "Conventional",
  "terrain": "Plains",
  "force_ratio": 1.5,
  "technology_gap": 1.0,
  "supply_lines": 0.85,
  "morale": 0.8,
  "weather": "Clear"
}
```

### Filter Conflicts

```
GET /api/conflicts?era=Ancient&strategy_type=Flanking&terrain=Plains
```

Supported query parameters: `era`, `region`, `strategy_type`, `country`, `outcome`, `terrain`, `limit`, `offset`

---

## 🖥️ Dashboard Guide

| Tab | Description |
|-----|-------------|
| **Overview** | Stats cards, strategy win rates bar chart, conflicts per era, recent conflicts table |
| **Timeline** | Vertical chronological timeline filterable by era; click to expand conflict details |
| **Strategy Map** | Interactive world map with conflict markers; filter by strategy type and outcome |
| **Simulation** | Configure battle parameters (strategy, terrain, force ratio, weather) and run simulation |
| **Compare** | Select two strategies for radar chart, effectiveness bar chart, and historical examples |

---

## 📊 Data Format

Each conflict entry in `historical_data.json`:

```json
{
  "id": "unique_identifier",
  "name": "Battle/War Name",
  "year": -490,
  "era": "Ancient|Medieval|Early Modern|Modern|Contemporary",
  "country_a": "Attacker nation",
  "country_b": "Defender nation",
  "region": "Europe|Asia|Africa|Americas|Middle East|Global",
  "strategy_type": "Guerrilla|Conventional|Naval|Siege|Psychological|Blitzkrieg|Attrition|Flanking|Deception|Coalition",
  "outcome": "Victory|Defeat|Draw",
  "duration_days": 1,
  "terrain": "Mountains|Plains|Sea|Urban|Forest|Desert",
  "key_tactics": ["tactic1", "tactic2"],
  "description": "Educational description",
  "lessons": ["lesson1", "lesson2"],
  "casualties_estimate": 50000,
  "technology_level": "Bronze Age|Iron Age|Medieval|Gunpowder|Industrial|Modern",
  "notable_leaders": ["Leader1", "Leader2"]
}
```

---

## 🤖 Model Documentation

### StrategyClassifier
- **Algorithm**: RandomForestClassifier (200 trees, max_depth=15, balanced class weight)
- **Features**: Era (encoded), Region (encoded), Terrain (encoded), Technology Level (encoded), Year (normalized), Duration (normalized), Casualties (log-normalized), Outcome score
- **Target**: Strategy type (10 classes)
- **Evaluation**: 5-fold stratified cross-validation

### StrategyRecommender
- Wraps StrategyClassifier to produce top-k strategy recommendations
- Returns confidence scores and descriptions for each recommendation
- Falls back to terrain-based heuristics when model is unavailable

### MLPClassifier (Alternative)
- Architecture: 128→64→32 hidden layers, ReLU activation
- Optimizer: Adam with early stopping
- Training: Up to 500 iterations with 10% validation split

---

## ⚙️ Simulation Algorithm

The `HistoricalSimulationEngine` computes victory probability using:

```
score = base_effectiveness(strategy, terrain)
      × counter_modifier(attacker_strategy vs defender_strategy)
      × terrain_multiplier(strategy, terrain)
      × weather_modifier
      + log(force_ratio) × 0.1
      + technology_gap × 0.075
      + (supply_lines - 0.5) × 0.3
      + (morale - 0.5) × 0.25

victory_probability = sigmoid(3 × (attacker_score - defender_score))
```

**Strategy Effectiveness Matrix** — 10 strategies × 6 terrains (60 values derived from historical data)

**Strategy Counters** — 10×10 matrix of historical effectiveness relationships

---

## 🚢 Deployment

### Vercel (Dashboard)

```bash
cd dashboard
npx vercel --env NEXT_PUBLIC_API_URL=https://your-api.railway.app
```

### Railway (API)

```bash
# In railway project settings:
# Build command: pip install -r requirements.txt
# Start command: uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8001` | API base URL for dashboard |
| `PORT` | `8001` | API server port |

---

## 📜 Historical Conflicts Included

| Era | Conflicts |
|-----|-----------|
| Ancient | Marathon, Thermopylae, Gaugamela, Cannae, Punic Wars, Hannibal's Italian Campaign |
| Medieval | Hastings, Mongol Conquests, Agincourt, Constantinople, Hundred Years War |
| Early Modern | Thirty Years War, Battle of Waterloo |
| Modern | Gettysburg, Verdun, D-Day, Stalingrad, Battle of Britain, Midway, Kursk, Iwo Jima, Isandlwana |
| Contemporary | Inchon, Vietnam, Six-Day War, Yom Kippur, Gulf War, Falklands, Tet Offensive, Afghan-Soviet War, Battle of Algiers, Siege of Leningrad |

---

## 📄 License

MIT License — Educational and research use.

---

*Built with ❤️ using FastAPI, scikit-learn, Next.js, React-Leaflet, and Recharts*
