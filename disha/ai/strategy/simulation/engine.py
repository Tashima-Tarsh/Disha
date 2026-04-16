"""
Historical Simulation Engine for the Historical Strategy Intelligence System.
Provides probabilistic battle outcome simulation based on historical strategy patterns.
"""

import json
import logging
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Any

from simulation.scenarios import (
    STRATEGY_COUNTERS,
    TERRAIN_MULTIPLIERS,
    SCENARIOS,
)

DATA_FILE = Path(__file__).parent.parent / "data" / "historical_data.json"

logger = logging.getLogger(__name__)

# Historical success rates by strategy and terrain
STRATEGY_EFFECTIVENESS: Dict[str, Dict[str, float]] = {
    "Guerrilla": {"Mountains": 0.85, "Forest": 0.80, "Urban": 0.75, "Plains": 0.45, "Desert": 0.60, "Sea": 0.20},
    "Conventional": {"Plains": 0.75, "Desert": 0.70, "Mountains": 0.45, "Forest": 0.50, "Urban": 0.55, "Sea": 0.40},
    "Naval": {"Sea": 0.90, "Plains": 0.20, "Desert": 0.15, "Mountains": 0.10, "Forest": 0.15, "Urban": 0.30},
    "Siege": {"Urban": 0.80, "Mountains": 0.60, "Plains": 0.50, "Desert": 0.45, "Forest": 0.40, "Sea": 0.20},
    "Blitzkrieg": {"Plains": 0.85, "Desert": 0.80, "Forest": 0.50, "Mountains": 0.35, "Urban": 0.55, "Sea": 0.20},
    "Attrition": {"Mountains": 0.70, "Forest": 0.65, "Urban": 0.75, "Plains": 0.60, "Desert": 0.55, "Sea": 0.40},
    "Flanking": {"Plains": 0.80, "Desert": 0.75, "Forest": 0.55, "Mountains": 0.45, "Urban": 0.60, "Sea": 0.50},
    "Deception": {"Urban": 0.80, "Forest": 0.75, "Mountains": 0.70, "Plains": 0.70, "Desert": 0.65, "Sea": 0.60},
    "Psychological": {"Urban": 0.75, "Plains": 0.65, "Forest": 0.60, "Mountains": 0.55, "Desert": 0.60, "Sea": 0.50},
    "Coalition": {"Plains": 0.75, "Desert": 0.70, "Sea": 0.70, "Mountains": 0.65, "Forest": 0.60, "Urban": 0.65},
}

WEATHER_MODIFIERS: Dict[str, float] = {
    "Clear": 1.0,
    "Rain": 0.9,
    "Snow": 0.8,
    "Storm": 0.7,
}

# Tactical advice library by strategy
TACTICAL_ADVICE: Dict[str, List[str]] = {
    "Guerrilla": [
        "Avoid decisive engagements — strike and withdraw",
        "Use terrain for concealment and ambush positions",
        "Maintain civilian support network for intelligence and supplies",
        "Target supply lines and communication rather than main forces",
        "Disperse forces to avoid concentrated artillery/air strikes",
    ],
    "Blitzkrieg": [
        "Concentrate armor at the point of breakthrough, not on a broad front",
        "Maintain momentum — do not stop to consolidate after breakthrough",
        "Protect flanks with motorized infantry following armor",
        "Disrupt enemy command with deep penetrations to headquarters",
        "Air support must neutralize enemy air before ground operations begin",
    ],
    "Conventional": [
        "Establish clear fire superiority before advancing",
        "Protect flanks and maintain reserve for counter-attacks",
        "Coordinate all arms: infantry, armor, artillery, air",
        "Secure logistics before engaging main enemy force",
        "Establish clear command hierarchy and communication",
    ],
    "Naval": [
        "Establish air superiority over the fleet before engagement",
        "Use submarines to interdict enemy supply lines",
        "Protect carrier groups — they are irreplaceable assets",
        "Exploit interior lines for rapid fleet concentration",
        "Mine approaches to deny enemy freedom of movement",
    ],
    "Siege": [
        "Cut all supply lines and communication first",
        "Establish own defensive perimeter against relief forces",
        "Use artillery and engineering to systematically reduce defenses",
        "Maintain psychological pressure through continuous operations",
        "Prepare for a long operation — sieges reward patience",
    ],
    "Attrition": [
        "Ensure superior logistics sustainability before beginning",
        "Rotate units to prevent exhaustion and maintain combat effectiveness",
        "Target enemy supply and production before engaging frontline forces",
        "Prepare deep defensive zones to absorb counterattacks",
        "Set realistic attrition ratios — aim to exchange at favorable rates",
    ],
    "Flanking": [
        "Pin enemy front while preparing flanking force",
        "Ensure flanking force is fast enough to complete encirclement before enemy reacts",
        "Protect your own flanks as you maneuver",
        "Coordinate timing between pinning force and flanking force",
        "Maintain a reserve to exploit the encirclement or meet counterattacks",
    ],
    "Deception": [
        "Create false indicators in multiple locations to confuse enemy",
        "Use operational security — deception fails if intentions are leaked",
        "Time the real operation to prevent enemy recovery from deception",
        "Use double agents and false radio traffic to reinforce deception",
        "Ensure deception is plausible — enemy must believe the false picture",
    ],
    "Psychological": [
        "Identify and target sources of enemy morale and will to fight",
        "Use symbolic victories to amplify psychological effect",
        "Coordinate military action with information and media operations",
        "Target leadership credibility rather than only military forces",
        "Sustain psychological pressure without allowing the enemy to adapt",
    ],
    "Coalition": [
        "Establish unified command structure before operations begin",
        "Agree on strategic objectives — divergent goals fracture alliances",
        "Ensure equitable burden-sharing to maintain coalition cohesion",
        "Leverage each partner's comparative advantage",
        "Prepare for coalition partners to defect under pressure — have contingencies",
    ],
}

RISK_FACTORS: Dict[str, List[str]] = {
    "supply_lines": [
        "Low supply reliability creates logistical crisis under sustained operations",
        "Extended supply lines are vulnerable to guerrilla interdiction",
        "Supply constraints will limit operational tempo and duration",
    ],
    "morale": [
        "Low morale risks unit cohesion collapse under pressure",
        "Morale collapse can rapidly reverse military advantage",
        "Leadership must prioritize morale through communication and care",
    ],
    "force_ratio": [
        "Force inferiority requires qualitative advantage to compensate",
        "Inferior force must maximize defensive terrain advantage",
        "Small force advantage means any attrition favors the larger side",
    ],
    "technology": [
        "Technology gap creates vulnerability to precision strikes",
        "Superior technology forces opponent into asymmetric tactics",
        "Technology advantage degrades over time as enemy adapts",
    ],
    "weather": [
        "Adverse weather degrades air support and visibility",
        "Storm conditions favor defenders and guerrilla forces",
        "Logistics deteriorate significantly in adverse weather",
    ],
}


@dataclass
class SimulationResult:
    """Result of a battle simulation."""
    victory_probability: float
    recommended_strategy: str
    alternative_strategies: List[Dict[str, Any]]
    risk_assessment: Dict[str, Any]
    historical_parallels: List[Dict[str, Any]]
    tactical_advice: List[str]
    attacker_score: float
    defender_score: float
    outcome_label: str
    confidence_level: str
    scenario_summary: str
    strategy_breakdown: Dict[str, float] = field(default_factory=dict)


class HistoricalSimulationEngine:
    """
    Core simulation engine that models battle outcomes based on historical strategy patterns.
    Uses weighted scoring combining terrain effectiveness, strategy counters, force ratios,
    technology gaps, supply lines, morale, and weather conditions.
    """

    def __init__(self):
        self.historical_data: List[Dict[str, Any]] = []
        self._load_data()

    def _load_data(self):
        """Load historical conflict database."""
        if DATA_FILE.exists():
            with open(DATA_FILE) as f:
                self.historical_data = json.load(f)
            logger.info("Loaded %d historical conflicts.", len(self.historical_data))
        else:
            logger.warning("Data file not found at %s", DATA_FILE)

    def run_simulation(self, scenario_params: Dict[str, Any]) -> SimulationResult:
        """
        Core simulation algorithm. Computes victory probability for attacker.

        Parameters:
            attacker_strategy: str
            defender_strategy: str
            terrain: str
            force_ratio: float (attacker_strength / defender_strength, e.g. 1.5 = 50% more forces)
            technology_gap: float (-2 to 2, positive = attacker advantage)
            supply_lines: float (0-1, attacker supply reliability)
            morale: float (0-1, attacker morale)
            weather: str (Clear/Rain/Snow/Storm)
        """
        attacker_strategy = scenario_params.get("attacker_strategy", "Conventional")
        defender_strategy = scenario_params.get("defender_strategy", "Conventional")
        terrain = scenario_params.get("terrain", "Plains")
        force_ratio = float(scenario_params.get("force_ratio", 1.0))
        technology_gap = float(scenario_params.get("technology_gap", 0.0))
        supply_lines = float(scenario_params.get("supply_lines", 0.8))
        morale = float(scenario_params.get("morale", 0.75))
        weather = scenario_params.get("weather", "Clear")

        # 1. Base effectiveness from historical data
        attacker_base = STRATEGY_EFFECTIVENESS.get(attacker_strategy, {}).get(terrain, 0.5)
        defender_base = STRATEGY_EFFECTIVENESS.get(defender_strategy, {}).get(terrain, 0.5)

        # 2. Strategy counter relationships
        counter_modifier = STRATEGY_COUNTERS.get(attacker_strategy, {}).get(defender_strategy, 1.0)

        # 3. Terrain multipliers
        atk_terrain_mult = TERRAIN_MULTIPLIERS.get(attacker_strategy, {}).get(terrain, 1.0)
        def_terrain_mult = TERRAIN_MULTIPLIERS.get(defender_strategy, {}).get(terrain, 1.0)

        # 4. Force ratio effect (logarithmic — asymptotic advantage)
        force_effect = 0.1 * math.log(max(force_ratio, 0.1))

        # 5. Technology gap effect (±15% per unit)
        tech_effect = 0.075 * technology_gap

        # 6. Supply line effect (critical below 0.5)
        supply_effect = (supply_lines - 0.5) * 0.3

        # 7. Morale effect
        morale_effect = (morale - 0.5) * 0.25

        # 8. Weather modifier
        weather_mod = WEATHER_MODIFIERS.get(weather, 1.0)

        # Compute attacker score
        attacker_score = (
            attacker_base *
            counter_modifier *
            atk_terrain_mult *
            weather_mod +
            force_effect +
            tech_effect +
            supply_effect +
            morale_effect
        )

        # Compute defender score (defender gets terrain bonus but no counter modifier advantage here)
        defender_score = (
            defender_base *
            def_terrain_mult *
            weather_mod +
            (1.0 - supply_lines) * 0.1
        )

        # Convert scores to probability using sigmoid
        score_diff = attacker_score - defender_score
        victory_prob = 1.0 / (1.0 + math.exp(-3.0 * score_diff))
        victory_prob = round(max(0.05, min(0.95, victory_prob)), 3)

        # Determine outcome label
        if victory_prob >= 0.70:
            outcome_label = "Attacker Victory Likely"
            confidence_level = "High" if victory_prob >= 0.80 else "Moderate"
        elif victory_prob >= 0.55:
            outcome_label = "Attacker Marginal Advantage"
            confidence_level = "Low"
        elif victory_prob >= 0.45:
            outcome_label = "Contested — Outcome Uncertain"
            confidence_level = "Very Low"
        elif victory_prob >= 0.30:
            outcome_label = "Defender Marginal Advantage"
            confidence_level = "Low"
        else:
            outcome_label = "Defender Victory Likely"
            confidence_level = "High" if victory_prob <= 0.20 else "Moderate"

        # Find recommended strategy
        best_strategy, alt_strategies = self._recommend_strategy(terrain, force_ratio, technology_gap)

        # Historical parallels
        parallels = self.find_historical_parallels(scenario_params)

        # Risk assessment
        risks = self.assess_risk(scenario_params)

        # Tactical advice for attacker
        advice = TACTICAL_ADVICE.get(attacker_strategy, ["Adapt tactics to terrain and enemy", "Maintain flexibility"])

        # Strategy breakdown scores
        strategy_breakdown = {
            "base_effectiveness": round(attacker_base, 3),
            "counter_modifier": round(counter_modifier, 3),
            "terrain_multiplier": round(atk_terrain_mult, 3),
            "force_effect": round(force_effect, 3),
            "tech_effect": round(tech_effect, 3),
            "supply_effect": round(supply_effect, 3),
            "morale_effect": round(morale_effect, 3),
            "weather_modifier": round(weather_mod, 3),
        }

        scenario_summary = (
            f"{attacker_strategy} vs {defender_strategy} on {terrain} terrain "
            f"(Force ratio: {force_ratio:.1f}x, Tech gap: {technology_gap:+.1f})"
        )

        return SimulationResult(
            victory_probability=victory_prob,
            recommended_strategy=best_strategy,
            alternative_strategies=alt_strategies,
            risk_assessment=risks,
            historical_parallels=parallels,
            tactical_advice=advice,
            attacker_score=round(attacker_score, 4),
            defender_score=round(defender_score, 4),
            outcome_label=outcome_label,
            confidence_level=confidence_level,
            scenario_summary=scenario_summary,
            strategy_breakdown=strategy_breakdown,
        )

    def _recommend_strategy(self, terrain: str, force_ratio: float, technology_gap: float):
        """Find the best strategy for the given terrain and situation."""
        scores = {}
        for strategy, terrain_map in STRATEGY_EFFECTIVENESS.items():
            base = terrain_map.get(terrain, 0.5)
            force_bonus = 0.05 * math.log(max(force_ratio, 0.1))
            tech_bonus = 0.03 * technology_gap
            scores[strategy] = base + force_bonus + tech_bonus

        sorted_strategies = sorted(scores.items(), key=lambda x: -x[1])
        best = sorted_strategies[0][0]
        alternatives = [
            {
                "strategy": s,
                "score": round(sc, 3),
                "description": TACTICAL_ADVICE.get(s, ["Use historical precedents"])[0],
            }
            for s, sc in sorted_strategies[1:4]
        ]
        return best, alternatives

    def find_historical_parallels(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find historically similar conflicts based on strategy, terrain, and era."""
        attacker_strategy = params.get("attacker_strategy", "Conventional")
        terrain = params.get("terrain", "Plains")

        parallels = []
        for conflict in self.historical_data:
            score = 0
            if conflict.get("strategy_type") == attacker_strategy:
                score += 3
            if conflict.get("terrain") == terrain:
                score += 2
            tech_level = params.get("technology_level", "")
            if tech_level and conflict.get("technology_level") == tech_level:
                score += 1
            if score >= 2:
                parallels.append({
                    "id": conflict.get("id"),
                    "name": conflict.get("name"),
                    "year": conflict.get("year"),
                    "outcome": conflict.get("outcome"),
                    "strategy_type": conflict.get("strategy_type"),
                    "terrain": conflict.get("terrain"),
                    "description": conflict.get("description", "")[:150],
                    "lessons": conflict.get("lessons", [])[:2],
                    "similarity_score": score,
                })

        parallels.sort(key=lambda x: -x["similarity_score"])
        return parallels[:5]

    def assess_risk(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive risk assessment for the given scenario."""
        risks = []
        risk_level = "Low"

        supply_lines = float(params.get("supply_lines", 0.8))
        morale = float(params.get("morale", 0.75))
        force_ratio = float(params.get("force_ratio", 1.0))
        technology_gap = float(params.get("technology_gap", 0.0))
        weather = params.get("weather", "Clear")

        if supply_lines < 0.5:
            risks.append({
                "factor": "Supply Lines",
                "level": "Critical",
                "detail": RISK_FACTORS["supply_lines"][0],
                "mitigation": "Secure supply routes before advancing; establish forward supply depots",
            })
            risk_level = "Critical"
        elif supply_lines < 0.7:
            risks.append({
                "factor": "Supply Lines",
                "level": "High",
                "detail": RISK_FACTORS["supply_lines"][1],
                "mitigation": "Prioritize logistical protection and establish alternate supply routes",
            })
            if risk_level not in ("Critical",):
                risk_level = "High"

        if morale < 0.4:
            risks.append({
                "factor": "Morale",
                "level": "Critical",
                "detail": RISK_FACTORS["morale"][1],
                "mitigation": "Address soldier welfare, provide clear objectives, communicate progress",
            })
            risk_level = "Critical"
        elif morale < 0.6:
            risks.append({
                "factor": "Morale",
                "level": "Moderate",
                "detail": RISK_FACTORS["morale"][0],
                "mitigation": "Rotate units, ensure rest and supply, improve leadership communication",
            })
            if risk_level == "Low":
                risk_level = "Moderate"

        if force_ratio < 0.7:
            risks.append({
                "factor": "Force Ratio",
                "level": "High",
                "detail": RISK_FACTORS["force_ratio"][0],
                "mitigation": "Seek decisive terrain advantage; avoid attrition; use deception and mobility",
            })
            if risk_level not in ("Critical",):
                risk_level = "High"

        if technology_gap < -1.0:
            risks.append({
                "factor": "Technology",
                "level": "High",
                "detail": RISK_FACTORS["technology"][0],
                "mitigation": "Compensate with terrain advantage, guerrilla tactics, and mass",
            })
            if risk_level not in ("Critical",):
                risk_level = "High"

        if weather in ("Snow", "Storm"):
            risks.append({
                "factor": "Weather",
                "level": "Moderate",
                "detail": RISK_FACTORS["weather"][0],
                "mitigation": "Adjust operational tempo for weather; ensure cold/wet weather equipment",
            })
            if risk_level == "Low":
                risk_level = "Moderate"

        if not risks:
            risks.append({
                "factor": "General",
                "level": "Low",
                "detail": "No critical risk factors identified. Maintain operational security.",
                "mitigation": "Continue standard risk management procedures",
            })

        return {
            "overall_risk_level": risk_level,
            "risk_factors": risks,
            "risk_score": self._compute_risk_score(supply_lines, morale, force_ratio, technology_gap, weather),
        }

    def _compute_risk_score(
            self, supply: float, morale: float, force_ratio: float,
            tech_gap: float, weather: str) -> float:
        """Compute a normalized risk score 0-1 (1=highest risk)."""
        supply_risk = max(0.0, 1.0 - supply)
        morale_risk = max(0.0, 1.0 - morale)
        force_risk = max(0.0, min(1.0, (1.0 - force_ratio) * 0.5 + 0.5))
        tech_risk = max(0.0, min(1.0, (-tech_gap + 2.0) / 4.0))
        weather_risk = {"Clear": 0.0, "Rain": 0.2, "Snow": 0.4, "Storm": 0.6}.get(weather, 0.1)

        score = (supply_risk * 0.3 + morale_risk * 0.25 + force_risk * 0.2 + tech_risk * 0.15 + weather_risk * 0.1)
        return round(min(1.0, score), 3)

    def compare_strategies(self, strategy_a: str, strategy_b: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare two strategies across all terrains and provide head-to-head analysis.
        """
        terrain = context.get("terrain", "Plains")

        a_terrain_scores = STRATEGY_EFFECTIVENESS.get(strategy_a, {})
        b_terrain_scores = STRATEGY_EFFECTIVENESS.get(strategy_b, {})

        terrain_comparison = {}
        all_terrains = ["Plains", "Desert", "Mountains", "Forest", "Urban", "Sea"]
        for t in all_terrains:
            a_score = a_terrain_scores.get(t, 0.5)
            b_score = b_terrain_scores.get(t, 0.5)
            terrain_comparison[t] = {
                "strategy_a": round(a_score, 3),
                "strategy_b": round(b_score, 3),
                "advantage": strategy_a if a_score > b_score else (strategy_b if b_score > a_score else "Equal"),
                "gap": round(abs(a_score - b_score), 3),
            }

        # Counter analysis
        a_vs_b = STRATEGY_COUNTERS.get(strategy_a, {}).get(strategy_b, 1.0)
        b_vs_a = STRATEGY_COUNTERS.get(strategy_b, {}).get(strategy_a, 1.0)

        # Historical performance
        a_conflicts = [c for c in self.historical_data if c.get("strategy_type") == strategy_a]
        b_conflicts = [c for c in self.historical_data if c.get("strategy_type") == strategy_b]

        a_wins = sum(1 for c in a_conflicts if c.get("outcome") == "Victory")
        b_wins = sum(1 for c in b_conflicts if c.get("outcome") == "Victory")

        a_win_rate = a_wins / len(a_conflicts) if a_conflicts else 0.0
        b_win_rate = b_wins / len(b_conflicts) if b_conflicts else 0.0

        head_to_head_winner = (
            strategy_a if a_vs_b > b_vs_a else (strategy_b if b_vs_a > a_vs_b else "Equal")
        )

        return {
            "strategy_a": strategy_a,
            "strategy_b": strategy_b,
            "terrain_comparison": terrain_comparison,
            "head_to_head_context": {
                f"{strategy_a}_vs_{strategy_b}_modifier": round(a_vs_b, 3),
                f"{strategy_b}_vs_{strategy_a}_modifier": round(b_vs_a, 3),
                "winner": head_to_head_winner,
            },
            "historical_performance": {
                strategy_a: {
                    "total_conflicts": len(a_conflicts),
                    "victories": a_wins,
                    "win_rate": round(a_win_rate, 3),
                    "best_terrain": max(a_terrain_scores, key=a_terrain_scores.get) if a_terrain_scores else "Unknown",
                },
                strategy_b: {
                    "total_conflicts": len(b_conflicts),
                    "victories": b_wins,
                    "win_rate": round(b_win_rate, 3),
                    "best_terrain": max(b_terrain_scores, key=b_terrain_scores.get) if b_terrain_scores else "Unknown",
                },
            },
            "tactical_advice_a": TACTICAL_ADVICE.get(strategy_a, []),
            "tactical_advice_b": TACTICAL_ADVICE.get(strategy_b, []),
            "current_terrain": terrain,
            "terrain_winner": terrain_comparison.get(terrain, {}).get("advantage", "Unknown"),
        }

    def get_predefined_scenario(self, scenario_name: str) -> Optional[Dict[str, Any]]:
        """Return a predefined scenario by name."""
        return SCENARIOS.get(scenario_name)

    def list_scenarios(self) -> List[str]:
        """Return list of all predefined scenario names."""
        return list(SCENARIOS.keys())


if __name__ == "__main__":
    engine = HistoricalSimulationEngine()

    print("\n--- Running blitzkrieg_plains scenario ---")
    scenario = SCENARIOS["blitzkrieg_plains"]
    result = engine.run_simulation(scenario)
    print(f"Victory Probability: {result.victory_probability:.1%}")
    print(f"Outcome: {result.outcome_label}")
    print(f"Recommended Strategy: {result.recommended_strategy}")
    print(f"Risk Level: {result.risk_assessment['overall_risk_level']}")
    print(f"Historical Parallels: {[p['name'] for p in result.historical_parallels]}")
    print(f"Tactical Advice: {result.tactical_advice[0]}")

    print("\n--- Strategy Comparison: Guerrilla vs Blitzkrieg ---")
    comparison = engine.compare_strategies("Guerrilla", "Blitzkrieg", {"terrain": "Forest"})
    print(f"Forest terrain winner: {comparison['terrain_comparison']['Forest']['advantage']}")
    print(f"Historical win rates: Guerrilla={comparison['historical_performance']['Guerrilla']['win_rate']}")
