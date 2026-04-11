"""
Suppressed Physics Engine — catalog and analysis of fringe/suppressed theories.
"""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)

_KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"


def _load_suppressed_json() -> dict:
    try:
        with open(_KNOWLEDGE_DIR / "suppressed_physics.json", "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"theories": []}


class SuppressedPhysicsEngine:
    """Analyzes and catalogs suppressed and fringe physics theories."""

    def __init__(self) -> None:
        self._data = _load_suppressed_json()
        self._theories = self._data.get("theories", [])
        self._keyword_map = self._build_keyword_map()

    # ── Public API ────────────────────────────────────────────────────────────

    def get_theories(self) -> list[dict]:
        """Return all theories with metadata."""
        return [self._enrich(t) for t in self._theories]

    def get_theory_by_id(self, theory_id: str) -> dict:
        """Return a specific theory by its id."""
        for theory in self._theories:
            if theory.get("id") == theory_id:
                return self._enrich(theory)
        return {"error": f"Theory '{theory_id}' not found",
                "available": [t.get("id") for t in self._theories]}

    def analyze_theory(self, theory_text: str) -> dict:
        """Keyword-match text against known theories; return analysis."""
        if not theory_text or not theory_text.strip():
            return {"error": "Empty text"}
        try:
            text_lower = theory_text.lower()
            scores: dict[str, float] = {}
            for tid, keywords in self._keyword_map.items():
                score = sum(1 for kw in keywords if re.search(r"\b" + re.escape(kw) + r"\b", text_lower))
                if score > 0:
                    scores[tid] = score

            if not scores:
                return {
                    "matched_theory": None,
                    "confidence": 0.0,
                    "mainstream_view": "No known suppressed/fringe theory matched the text.",
                    "alternative_view": "The text may describe mainstream physics.",
                    "related_concepts": [],
                    "disclaimer": self._data.get("disclaimer", ""),
                }

            best_id = max(scores, key=scores.get)
            total = sum(scores.values())
            confidence = round(scores[best_id] / total, 4)

            theory = next((t for t in self._theories if t.get("id") == best_id), {})
            all_matches = [
                {"id": tid, "name": self._theory_name(tid), "score": round(v / total, 3)}
                for tid, v in sorted(scores.items(), key=lambda x: -x[1])
            ]

            return {
                "matched_theory": theory.get("name", best_id),
                "theory_id": best_id,
                "confidence": confidence,
                "status": theory.get("status", "unknown"),
                "confidence_score": theory.get("confidence_score", 0.0),
                "mainstream_view": theory.get("refutation", theory.get("mainstream_note", "No mainstream consensus noted.")),
                "alternative_view": theory.get("description", ""),
                "key_proponents": theory.get("key_proponents", []),
                "related_concepts": theory.get("claimed_effects", theory.get("variants", [])),
                "all_matches": all_matches[:5],
                "disclaimer": self._data.get("disclaimer", ""),
            }
        except Exception:
            logger.exception("analyze_theory failed")
            return {"error": "Analysis failed"}

    # ── Private helpers ───────────────────────────────────────────────────────

    def _build_keyword_map(self) -> dict[str, list[str]]:
        km: dict[str, list[str]] = {}
        for theory in self._theories:
            tid = theory.get("id", "")
            keywords: list[str] = []
            keywords.append(theory.get("name", "").lower())
            for prop in theory.get("key_proponents", []):
                keywords.append(prop.lower())
            for effect in theory.get("claimed_effects", []):
                keywords.extend(effect.lower().split())
            for kw in self._data.get("keywords", []):
                keywords.append(kw.lower())
            if "variants" in theory:
                for v in theory["variants"]:
                    keywords.append(v.get("name", "").lower())
            km[tid] = list(set(kw for kw in keywords if len(kw) > 2))
        return km

    def _theory_name(self, tid: str) -> str:
        for t in self._theories:
            if t.get("id") == tid:
                return t.get("name", tid)
        return tid

    def _enrich(self, theory: dict) -> dict:
        enriched = dict(theory)
        score = theory.get("confidence_score", 0.0)
        if score < 0.05:
            enriched["risk_level"] = "rejected"
        elif score < 0.1:
            enriched["risk_level"] = "very_low"
        elif score < 0.2:
            enriched["risk_level"] = "low"
        else:
            enriched["risk_level"] = "contested"
        return enriched
