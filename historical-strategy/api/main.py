"""
FastAPI application for Historical Strategy Intelligence System.
Provides REST endpoints for conflict data, simulation, and analysis.
"""

import json
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from simulation.engine import HistoricalSimulationEngine, STRATEGY_EFFECTIVENESS
from simulation.scenarios import SCENARIOS

DATA_FILE = Path(__file__).parent.parent / "data" / "historical_data.json"

# Global state
conflicts_db: List[Dict[str, Any]] = []
engine: Optional[HistoricalSimulationEngine] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load conflict data and initialise simulation engine on startup."""
    global conflicts_db, engine
    if DATA_FILE.exists():
        with open(DATA_FILE) as f:
            conflicts_db = json.load(f)
        print(f"[API] Loaded {len(conflicts_db)} conflicts from {DATA_FILE}")
    else:
        print(f"[API] WARNING: Data file not found at {DATA_FILE}")
    engine = HistoricalSimulationEngine()
    yield
    # Shutdown: nothing to clean up for now


app = FastAPI(
    title="Historical Strategy Intelligence API",
    description="AI-powered analysis of historical military strategies and battle simulations",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────── Pydantic Models ────────────────────

class SimulationRequest(BaseModel):
    attacker_strategy: str = Field(..., description="Attacking force strategy type")
    defender_strategy: str = Field(..., description="Defending force strategy type")
    terrain: str = Field(..., description="Battlefield terrain")
    force_ratio: float = Field(1.0, ge=0.1, le=10.0, description="Attacker/defender force ratio")
    technology_gap: float = Field(0.0, ge=-2.0, le=2.0, description="Technology advantage (-2 to +2)")
    supply_lines: float = Field(0.8, ge=0.0, le=1.0, description="Attacker supply reliability (0-1)")
    morale: float = Field(0.75, ge=0.0, le=1.0, description="Attacker morale (0-1)")
    weather: str = Field("Clear", description="Weather conditions")


class AnalysisRequest(BaseModel):
    era: Optional[str] = None
    region: Optional[str] = None
    terrain: Optional[str] = None
    technology_level: Optional[str] = None
    year: Optional[int] = None
    top_k: int = Field(3, ge=1, le=10)


class CompareRequest(BaseModel):
    strategy_a: str
    strategy_b: str
    terrain: str = "Plains"


# ──────────────────── Endpoints ────────────────────

@app.get("/", tags=["System"])
async def root():
    """Health check and system info."""
    return {
        "status": "online",
        "service": "Historical Strategy Intelligence API",
        "version": "1.0.0",
        "total_conflicts": len(conflicts_db),
        "strategies_available": list(STRATEGY_EFFECTIVENESS.keys()),
        "terrains_available": ["Plains", "Desert", "Mountains", "Forest", "Urban", "Sea"],
        "eras_available": ["Ancient", "Medieval", "Early Modern", "Modern", "Contemporary"],
        "endpoints": [
            "GET /api/conflicts",
            "GET /api/conflicts/{id}",
            "GET /api/stats",
            "GET /api/strategies",
            "GET /api/timeline",
            "POST /api/simulate",
            "POST /api/analyze",
            "GET /api/eras",
            "GET /api/leaders",
            "GET /api/scenarios",
        ],
    }


@app.get("/api/conflicts", tags=["Conflicts"])
async def list_conflicts(
    era: Optional[str] = Query(None, description="Filter by era"),
    region: Optional[str] = Query(None, description="Filter by region"),
    strategy_type: Optional[str] = Query(None, description="Filter by strategy type"),
    country: Optional[str] = Query(None, description="Filter by country (searches both sides)"),
    outcome: Optional[str] = Query(None, description="Filter by outcome"),
    terrain: Optional[str] = Query(None, description="Filter by terrain"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """List all historical conflicts with optional filters."""
    results = conflicts_db.copy()

    if era:
        results = [c for c in results if c.get("era", "").lower() == era.lower()]
    if region:
        results = [c for c in results if c.get("region", "").lower() == region.lower()]
    if strategy_type:
        results = [c for c in results if c.get("strategy_type", "").lower() == strategy_type.lower()]
    if outcome:
        results = [c for c in results if c.get("outcome", "").lower() == outcome.lower()]
    if terrain:
        results = [c for c in results if c.get("terrain", "").lower() == terrain.lower()]
    if country:
        country_lower = country.lower()
        results = [
            c for c in results
            if country_lower in c.get("country_a", "").lower()
            or country_lower in c.get("country_b", "").lower()
        ]

    total = len(results)
    results = results[offset: offset + limit]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "conflicts": results,
    }


@app.get("/api/conflicts/{conflict_id}", tags=["Conflicts"])
async def get_conflict(conflict_id: str):
    """Get a specific conflict by ID."""
    for conflict in conflicts_db:
        if conflict.get("id") == conflict_id:
            return conflict
    raise HTTPException(status_code=404, detail=f"Conflict '{conflict_id}' not found")


@app.get("/api/stats", tags=["Analytics"])
async def get_stats():
    """Aggregate statistics across all historical conflicts."""
    from collections import Counter, defaultdict

    era_counts = Counter(c.get("era") for c in conflicts_db)
    region_counts = Counter(c.get("region") for c in conflicts_db)
    strategy_counts = Counter(c.get("strategy_type") for c in conflicts_db)
    terrain_counts = Counter(c.get("terrain") for c in conflicts_db)
    outcome_counts = Counter(c.get("outcome") for c in conflicts_db)

    # Win rates by strategy
    strategy_wins: Dict[str, list] = defaultdict(list)
    for c in conflicts_db:
        strategy = c.get("strategy_type", "Unknown")
        won = 1 if c.get("outcome") == "Victory" else 0
        strategy_wins[strategy].append(won)

    strategy_win_rates = {
        s: {
            "win_rate": round(sum(wins) / len(wins), 3) if wins else 0,
            "total": len(wins),
            "victories": sum(wins),
        }
        for s, wins in strategy_wins.items()
    }

    # Average casualties by era
    era_casualties: Dict[str, list] = defaultdict(list)
    for c in conflicts_db:
        era_casualties[c.get("era", "Unknown")].append(c.get("casualties_estimate", 0))
    avg_casualties_by_era = {
        era: round(sum(vals) / len(vals), 0) for era, vals in era_casualties.items()
    }

    # Strategy effectiveness by terrain from actual data
    terrain_strategy: Dict[str, Dict[str, list]] = defaultdict(lambda: defaultdict(list))
    for c in conflicts_db:
        terrain = c.get("terrain", "Unknown")
        strategy = c.get("strategy_type", "Unknown")
        won = 1 if c.get("outcome") == "Victory" else 0
        terrain_strategy[terrain][strategy].append(won)

    terrain_effectiveness = {
        terrain: {
            s: round(sum(wins) / len(wins), 3) if wins else 0
            for s, wins in strategies.items()
        }
        for terrain, strategies in terrain_strategy.items()
    }

    # Longest conflicts
    sorted_by_duration = sorted(conflicts_db, key=lambda x: -x.get("duration_days", 0))
    longest_conflicts = [
        {"id": c["id"], "name": c["name"], "duration_days": c.get("duration_days"), "era": c.get("era")}
        for c in sorted_by_duration[:5]
    ]

    # Most casualties
    sorted_by_casualties = sorted(conflicts_db, key=lambda x: -x.get("casualties_estimate", 0))
    deadliest_conflicts = [
        {"id": c["id"], "name": c["name"], "casualties_estimate": c.get("casualties_estimate"), "year": c.get("year")}
        for c in sorted_by_casualties[:5]
    ]

    return {
        "total_conflicts": len(conflicts_db),
        "era_distribution": dict(era_counts),
        "region_distribution": dict(region_counts),
        "strategy_distribution": dict(strategy_counts),
        "terrain_distribution": dict(terrain_counts),
        "outcome_distribution": dict(outcome_counts),
        "strategy_win_rates": strategy_win_rates,
        "avg_casualties_by_era": avg_casualties_by_era,
        "terrain_effectiveness": terrain_effectiveness,
        "longest_conflicts": longest_conflicts,
        "deadliest_conflicts": deadliest_conflicts,
        "year_range": {
            "earliest": min(c.get("year", 0) for c in conflicts_db),
            "latest": max(c.get("year", 0) for c in conflicts_db),
        },
    }


@app.get("/api/strategies", tags=["Analytics"])
async def list_strategies():
    """List all strategy types with descriptions, historical examples, and effectiveness data."""
    strategy_info = {
        "Guerrilla": {
            "description": "Irregular warfare using small mobile forces for hit-and-run attacks and attrition.",
            "strengths": ["Effective in forests and mountains", "Low force requirements", "Hard to counter with conventional tactics"],
            "weaknesses": ["Cannot hold territory easily", "Depends on civilian support", "Ineffective at sea"],
            "famous_examples": ["Vietnam War", "Soviet-Afghan War", "Battle of Algiers"],
        },
        "Blitzkrieg": {
            "description": "Rapid armored and air combined operations to penetrate and disrupt enemy command.",
            "strengths": ["High speed and shock effect", "Devastating on open terrain", "Paralyzes enemy command"],
            "weaknesses": ["Vulnerable to supply interdiction", "Ineffective in forests/mountains", "Requires air superiority"],
            "famous_examples": ["Fall of France 1940", "Six-Day War 1967", "Gulf War 1991"],
        },
        "Conventional": {
            "description": "Standard organized military operations using all arms in coordinated maneuver.",
            "strengths": ["Flexible", "Can be adapted to most situations", "Well-understood doctrine"],
            "weaknesses": ["Predictable", "Can be countered by asymmetric tactics", "Resource intensive"],
            "famous_examples": ["Battle of Waterloo", "Battle of the Bulge", "Korean War"],
        },
        "Naval": {
            "description": "Control of maritime lanes through fleet engagements, blockades, and power projection.",
            "strengths": ["Strategic reach", "Trade blockade capability", "Enables amphibious operations"],
            "weaknesses": ["Limited to water environments", "Expensive and slow to rebuild losses", "Vulnerable to submarines"],
            "famous_examples": ["Battle of Trafalgar", "Battle of Midway", "Falklands War"],
        },
        "Siege": {
            "description": "Systematic reduction of fortified positions through encirclement, bombardment, and assault.",
            "strengths": ["Effective against fortifications", "Minimal maneuver required", "Can starve out defenders"],
            "weaknesses": ["Slow", "Vulnerable to relief forces", "Costly in time and resources"],
            "famous_examples": ["Fall of Constantinople", "Siege of Leningrad", "Battle of Stalingrad"],
        },
        "Attrition": {
            "description": "Wearing down the enemy through sustained casualties and resource depletion.",
            "strengths": ["Favors larger forces", "Sustainable", "Degrades enemy over time"],
            "weaknesses": ["Destroys own forces too", "Low morale impact", "Politically costly"],
            "famous_examples": ["Battle of Verdun", "Battle of the Somme", "Iran-Iraq War"],
        },
        "Flanking": {
            "description": "Attacking enemy flanks and rear to achieve encirclement and decisive victory.",
            "strengths": ["Decisive when successful", "Maximizes kills per unit", "Psychological impact"],
            "weaknesses": ["Requires mobility and coordination", "Flanks can be turned against you", "Complex execution"],
            "famous_examples": ["Battle of Cannae", "Battle of Tannenberg", "Operation Bagration"],
        },
        "Deception": {
            "description": "Misleading the enemy about intentions, location, or capabilities to achieve surprise.",
            "strengths": ["Force multiplier", "Achieves surprise against larger forces", "Low cost"],
            "weaknesses": ["Requires intelligence dominance", "Fails if penetrated", "One-time use per operation"],
            "famous_examples": ["D-Day Deception (Fortitude)", "Battle of Midway", "Battle of Hastings feint"],
        },
        "Psychological": {
            "description": "Targeting enemy morale, will to fight, and political cohesion rather than just military forces.",
            "strengths": ["Can win without military victory", "Amplified by media", "Exploits political divisions"],
            "weaknesses": ["Unpredictable results", "Requires political context", "Can backfire"],
            "famous_examples": ["Tet Offensive", "Mongol terror campaigns", "British strategic bombing WWII"],
        },
        "Coalition": {
            "description": "Uniting multiple states or groups against a common enemy to multiply resources.",
            "strengths": ["Massive resource advantage", "Political legitimacy", "Shared risk"],
            "weaknesses": ["Coordination friction", "Divergent objectives", "Vulnerable to divide-and-conquer"],
            "famous_examples": ["WWI Allied Coalition", "WWII Allied Powers", "Gulf War Coalition"],
        },
    }

    # Add historical effectiveness from data
    from collections import defaultdict
    strategy_wins: Dict[str, list] = defaultdict(list)
    for c in conflicts_db:
        strategy = c.get("strategy_type", "Unknown")
        won = 1 if c.get("outcome") == "Victory" else 0
        strategy_wins[strategy].append(won)

    for strategy, info in strategy_info.items():
        wins = strategy_wins.get(strategy, [])
        info["historical_win_rate"] = round(sum(wins) / len(wins), 3) if wins else 0.0
        info["historical_conflicts"] = len(wins)
        info["terrain_effectiveness"] = STRATEGY_EFFECTIVENESS.get(strategy, {})

    return {
        "strategies": strategy_info,
        "total": len(strategy_info),
    }


@app.get("/api/timeline", tags=["Analytics"])
async def get_timeline():
    """Return conflicts sorted chronologically for timeline display."""
    sorted_conflicts = sorted(conflicts_db, key=lambda x: x.get("year", 0))
    return {
        "total": len(sorted_conflicts),
        "timeline": sorted_conflicts,
        "era_boundaries": {
            "Ancient": {"start": -3000, "end": 500},
            "Medieval": {"start": 500, "end": 1500},
            "Early Modern": {"start": 1500, "end": 1800},
            "Modern": {"start": 1800, "end": 1945},
            "Contemporary": {"start": 1945, "end": 2024},
        },
    }


@app.post("/api/simulate", tags=["Simulation"])
async def run_simulation(request: SimulationRequest):
    """
    Run a battle simulation based on the provided scenario parameters.
    Returns victory probability, recommended strategy, risks, and historical parallels.
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Simulation engine not initialized")

    valid_strategies = list(STRATEGY_EFFECTIVENESS.keys())
    if request.attacker_strategy not in valid_strategies:
        raise HTTPException(status_code=400, detail=f"Invalid attacker_strategy. Must be one of: {valid_strategies}")
    if request.defender_strategy not in valid_strategies:
        raise HTTPException(status_code=400, detail=f"Invalid defender_strategy. Must be one of: {valid_strategies}")
    valid_terrains = ["Plains", "Desert", "Mountains", "Forest", "Urban", "Sea"]
    if request.terrain not in valid_terrains:
        raise HTTPException(status_code=400, detail=f"Invalid terrain. Must be one of: {valid_terrains}")
    valid_weather = ["Clear", "Rain", "Snow", "Storm"]
    if request.weather not in valid_weather:
        raise HTTPException(status_code=400, detail=f"Invalid weather. Must be one of: {valid_weather}")

    params = request.model_dump()
    result = engine.run_simulation(params)

    return {
        "victory_probability": result.victory_probability,
        "outcome_label": result.outcome_label,
        "confidence_level": result.confidence_level,
        "scenario_summary": result.scenario_summary,
        "recommended_strategy": result.recommended_strategy,
        "alternative_strategies": result.alternative_strategies,
        "attacker_score": result.attacker_score,
        "defender_score": result.defender_score,
        "strategy_breakdown": result.strategy_breakdown,
        "risk_assessment": result.risk_assessment,
        "historical_parallels": result.historical_parallels,
        "tactical_advice": result.tactical_advice,
        "input_params": params,
    }


@app.post("/api/analyze", tags=["Simulation"])
async def analyze_scenario(request: AnalysisRequest):
    """
    Analyze a scenario context and return strategy recommendations based on historical patterns.
    """
    terrain = request.terrain or "Plains"
    force_ratio = 1.0
    technology_gap = 0.0

    scores: Dict[str, float] = {}
    for strategy, terrain_map in STRATEGY_EFFECTIVENESS.items():
        scores[strategy] = terrain_map.get(terrain, 0.5)

    # Apply filters from historical data
    filtered = conflicts_db.copy()
    if request.era:
        filtered = [c for c in filtered if c.get("era", "").lower() == request.era.lower()]
    if request.region:
        filtered = [c for c in filtered if c.get("region", "").lower() == request.region.lower()]
    if request.terrain:
        filtered = [c for c in filtered if c.get("terrain", "").lower() == request.terrain.lower()]

    # Compute win rates from filtered data
    from collections import defaultdict
    strategy_wins: Dict[str, list] = defaultdict(list)
    for c in filtered:
        s = c.get("strategy_type", "Unknown")
        won = 1 if c.get("outcome") == "Victory" else 0
        strategy_wins[s].append(won)

    recommendations = []
    for strategy in sorted(scores.keys(), key=lambda x: -scores[x])[: request.top_k]:
        wins = strategy_wins.get(strategy, [])
        recommendations.append({
            "rank": len(recommendations) + 1,
            "strategy": strategy,
            "terrain_score": round(scores[strategy], 3),
            "historical_win_rate": round(sum(wins) / len(wins), 3) if wins else None,
            "historical_examples": len(wins),
            "terrain_effectiveness": STRATEGY_EFFECTIVENESS.get(strategy, {}).get(terrain, 0.5),
        })

    return {
        "terrain": terrain,
        "era_filter": request.era,
        "region_filter": request.region,
        "recommendations": recommendations,
        "relevant_conflicts": [
            {"id": c["id"], "name": c["name"], "year": c["year"], "outcome": c["outcome"]}
            for c in filtered[:10]
        ],
    }


@app.get("/api/eras", tags=["Analytics"])
async def get_eras():
    """List all historical eras with conflict counts and statistics."""
    from collections import defaultdict, Counter

    era_data: Dict[str, Any] = defaultdict(lambda: {"conflicts": [], "win_count": 0, "total": 0})
    for c in conflicts_db:
        era = c.get("era", "Unknown")
        era_data[era]["conflicts"].append(c)
        era_data[era]["total"] += 1
        if c.get("outcome") == "Victory":
            era_data[era]["win_count"] += 1

    era_order = ["Ancient", "Medieval", "Early Modern", "Modern", "Contemporary"]

    result = []
    for era in era_order:
        if era in era_data:
            data = era_data[era]
            conflicts = data["conflicts"]
            strategies = Counter(c.get("strategy_type") for c in conflicts)
            result.append({
                "era": era,
                "conflict_count": data["total"],
                "avg_casualties": round(
                    sum(c.get("casualties_estimate", 0) for c in conflicts) / data["total"], 0
                ) if data["total"] > 0 else 0,
                "dominant_strategy": strategies.most_common(1)[0][0] if strategies else "N/A",
                "strategy_distribution": dict(strategies),
                "year_range": {
                    "start": min(c.get("year", 0) for c in conflicts),
                    "end": max(c.get("year", 0) for c in conflicts),
                } if conflicts else {},
            })

    return {"eras": result, "total": len(result)}


@app.get("/api/leaders", tags=["Analytics"])
async def get_leaders():
    """List notable historical leaders with their associated conflicts."""
    from collections import defaultdict

    leader_conflicts: Dict[str, list] = defaultdict(list)
    for c in conflicts_db:
        for leader in c.get("notable_leaders", []):
            leader_conflicts[leader].append({
                "id": c["id"],
                "name": c["name"],
                "year": c.get("year"),
                "era": c.get("era"),
                "outcome": c.get("outcome"),
                "strategy_type": c.get("strategy_type"),
            })

    result = []
    for leader, leader_confs in sorted(leader_conflicts.items()):
        wins = sum(1 for c in leader_confs if c.get("outcome") == "Victory")
        result.append({
            "leader": leader,
            "conflicts": leader_confs,
            "total_conflicts": len(leader_confs),
            "victories": wins,
            "win_rate": round(wins / len(leader_confs), 3) if leader_confs else 0.0,
            "eras": list(set(c.get("era") for c in leader_confs)),
        })

    result.sort(key=lambda x: -x["total_conflicts"])
    return {"leaders": result, "total": len(result)}


@app.get("/api/scenarios", tags=["Simulation"])
async def list_scenarios():
    """List all predefined simulation scenarios."""
    return {
        "scenarios": [
            {
                "id": key,
                "name": scenario["name"],
                "description": scenario["description"],
                "attacker_strategy": scenario["attacker_strategy"],
                "defender_strategy": scenario["defender_strategy"],
                "terrain": scenario["terrain"],
                "expected_victor": scenario.get("expected_victor", "Unknown"),
                "historical_examples": scenario.get("historical_examples", []),
            }
            for key, scenario in SCENARIOS.items()
        ],
        "total": len(SCENARIOS),
    }


@app.post("/api/compare", tags=["Analytics"])
async def compare_strategies(request: CompareRequest):
    """Compare two strategies head-to-head across all terrains."""
    if engine is None:
        raise HTTPException(status_code=503, detail="Engine not initialized")

    valid = list(STRATEGY_EFFECTIVENESS.keys())
    if request.strategy_a not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid strategy_a. Must be one of: {valid}")
    if request.strategy_b not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid strategy_b. Must be one of: {valid}")

    comparison = engine.compare_strategies(
        request.strategy_a,
        request.strategy_b,
        {"terrain": request.terrain},
    )
    return comparison


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
