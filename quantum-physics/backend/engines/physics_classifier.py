"""
Physics Classifier — classifies text into physics domains using TF-IDF + LR
or keyword fallback when sklearn is unavailable.
"""
from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline
    _SKLEARN = True
except Exception:
    _SKLEARN = False

_KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"


def _load_json(filename: str) -> dict:
    try:
        with open(_KNOWLEDGE_DIR / filename, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


class PhysicsClassifier:
    """Classifies free-text descriptions of physics phenomena into domains."""

    def __init__(self) -> None:
        self._classical = _load_json("classical_physics.json")
        self._modern = _load_json("modern_physics.json")
        self._ancient = _load_json("ancient_physics.json")
        self._quantum = _load_json("quantum_physics.json")
        self._space = _load_json("space_science.json")
        self._suppressed = _load_json("suppressed_physics.json")

        self._domain_keywords: dict[str, list[str]] = {
            "Classical Physics": self._classical.get("keywords", []) + [
                "newton", "gravity", "force", "motion", "energy", "heat", "thermodynamics",
                "wave", "optics", "fluid", "viscosity", "maxwell", "electric", "magnetic",
                "lagrange", "hamilton", "entropy", "temperature",
            ],
            "Modern Physics": self._modern.get("keywords", []) + [
                "relativity", "spacetime", "einstein", "black hole", "gravitational wave",
                "standard model", "particle", "quark", "higgs", "string", "loop gravity",
                "lorentz", "photon", "field theory", "feynman",
            ],
            "Quantum Physics": self._quantum.get("keywords", []) + [
                "qubit", "superposition", "entanglement", "wavefunction", "uncertainty",
                "measurement", "decoherence", "quantum computer", "circuit", "gate",
                "bell state", "teleportation", "cryptography", "algorithm", "shor", "grover",
            ],
            "Space Science": self._space.get("keywords", []) + [
                "planet", "star", "galaxy", "universe", "orbit", "nasa", "telescope",
                "dark matter", "dark energy", "cmb", "big bang", "exoplanet", "asteroid",
                "comet", "solar", "kepler", "cosmology",
            ],
            "Ancient & Traditional Physics": self._ancient.get("keywords", []) + [
                "aristotle", "vedic", "ancient", "traditional", "element", "aether",
                "greek", "indian", "chinese", "mayan", "egyptian", "qi", "prana",
                "alchemy", "classical element", "natural philosophy",
            ],
            "Suppressed & Fringe Physics": self._suppressed.get("keywords", []) + [
                "free energy", "tesla", "cold fusion", "aether", "torsion", "fringe",
                "suppressed", "alternative", "conspiracy", "over-unity", "zero point",
                "hollow earth", "warp drive", "faster than light",
            ],
        }

        self._domain_concepts: dict[str, list[str]] = {
            "Classical Physics": ["mechanics", "electromagnetism", "thermodynamics", "optics", "fluid dynamics"],
            "Modern Physics": ["special relativity", "general relativity", "quantum field theory", "standard model", "string theory"],
            "Quantum Physics": ["quantum computing", "quantum cryptography", "entanglement", "superposition", "quantum algorithms"],
            "Space Science": ["cosmology", "orbital mechanics", "exoplanets", "black holes", "solar system"],
            "Ancient & Traditional Physics": ["Greek atomism", "Aristotelian physics", "Vedic cosmology", "Chinese five elements"],
            "Suppressed & Fringe Physics": ["aether theory", "cold fusion", "zero-point energy", "Tesla free energy", "electric universe"],
        }

        self._pipeline: Any = None
        if _SKLEARN:
            self._build_classifier()

    # ── Public API ────────────────────────────────────────────────────────────

    def classify(self, text: str) -> dict:
        if not text or not text.strip():
            return {"error": "Empty text provided"}
        try:
            if _SKLEARN and self._pipeline is not None:
                return self._ml_classify(text)
            return self._keyword_classify(text)
        except Exception as exc:
            logger.exception("classify failed")
            return {"error": "Classification failed", "domain": "Unknown", "confidence": 0.0}

    def get_domains(self) -> list[dict]:
        return [
            {"id": "classical", "name": "Classical Physics",
             "description": self._classical.get("description", ""),
             "timeline": f"{self._classical.get('timeline_start', 0)}–{self._classical.get('timeline_end', 0)}"},
            {"id": "modern", "name": "Modern Physics",
             "description": self._modern.get("description", ""),
             "timeline": f"{self._modern.get('timeline_start', 0)}–{self._modern.get('timeline_end', 0)}"},
            {"id": "quantum", "name": "Quantum Physics",
             "description": self._quantum.get("description", ""),
             "timeline": "1900–present"},
            {"id": "space", "name": "Space Science",
             "description": self._space.get("description", ""),
             "timeline": "Ancient–present"},
            {"id": "ancient", "name": "Ancient & Traditional Physics",
             "description": self._ancient.get("description", ""),
             "timeline": f"{self._ancient.get('timeline_start', -3000)}–{self._ancient.get('timeline_end', 1500)}"},
            {"id": "suppressed", "name": "Suppressed & Fringe Physics",
             "description": self._suppressed.get("description", ""),
             "timeline": "19th century–present"},
        ]

    def get_timeline(self) -> list[dict]:
        events: list[dict] = []

        for theory in self._classical.get("theories", []):
            events.append({
                "year": theory.get("year", 0),
                "name": theory["name"],
                "description": theory.get("description", ""),
                "contributors": theory.get("contributors", []),
                "domain": "Classical Physics",
                "color": "#00e5ff",
            })

        for theory in self._modern.get("theories", []):
            events.append({
                "year": theory.get("year", 0),
                "name": theory["name"],
                "description": theory.get("description", ""),
                "contributors": theory.get("contributors", []),
                "domain": "Modern Physics",
                "color": "#00ff88",
            })

        for tradition in self._ancient.get("traditions", []):
            events.append({
                "year": tradition.get("year", 0),
                "name": tradition["name"],
                "description": tradition.get("description", ""),
                "contributors": tradition.get("contributors", []),
                "domain": "Ancient & Traditional Physics",
                "color": "#ffd60a",
            })

        for topic in self._quantum.get("topics", []):
            pass  # quantum topics don't have discrete years on timeline

        for theory in self._suppressed.get("theories", []):
            events.append({
                "year": 1900,
                "name": theory["name"],
                "description": theory.get("description", ""),
                "contributors": theory.get("key_proponents", []),
                "domain": "Suppressed & Fringe Physics",
                "color": "#ff2d78",
                "confidence_score": theory.get("confidence_score", 0),
            })

        events.sort(key=lambda e: e["year"])
        return events

    # ── Private helpers ───────────────────────────────────────────────────────

    def _build_classifier(self) -> None:
        corpus: list[str] = []
        labels: list[str] = []
        for domain, keywords in self._domain_keywords.items():
            for kw in keywords:
                corpus.append(kw)
                labels.append(domain)
            # Add theory descriptions
            for theory in (
                self._classical.get("theories", [])
                + self._modern.get("theories", [])
                + self._ancient.get("traditions", [])
            ):
                corpus.append(theory.get("description", "") + " " + " ".join(theory.get("concepts", [])))
                if domain == "Classical Physics" and theory in self._classical.get("theories", []):
                    labels.append("Classical Physics")
                elif domain == "Modern Physics" and theory in self._modern.get("theories", []):
                    labels.append("Modern Physics")
                elif domain == "Ancient & Traditional Physics":
                    labels.append("Ancient & Traditional Physics")
        if len(set(labels)) < 2 or len(corpus) < 10:
            return
        try:
            self._pipeline = Pipeline([
                ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
                ("clf", LogisticRegression(max_iter=1000, C=1.0)),
            ])
            self._pipeline.fit(corpus, labels)
        except Exception:
            self._pipeline = None

    def _ml_classify(self, text: str) -> dict:
        proba = self._pipeline.predict_proba([text])[0]
        classes = self._pipeline.classes_
        top_idx = int(proba.argmax())
        domain = classes[top_idx]
        confidence = float(proba[top_idx])
        all_scores = {cls: round(float(p), 4) for cls, p in zip(classes, proba)}
        return {
            "domain": domain,
            "confidence": round(confidence, 4),
            "related_concepts": self._domain_concepts.get(domain, [])[:5],
            "all_domain_scores": all_scores,
            "method": "ml_tfidf_lr",
        }

    def _keyword_classify(self, text: str) -> dict:
        text_lower = text.lower()
        scores: dict[str, int] = {d: 0 for d in self._domain_keywords}
        for domain, keywords in self._domain_keywords.items():
            for kw in keywords:
                if re.search(r"\b" + re.escape(kw.lower()) + r"\b", text_lower):
                    scores[domain] += 1
        total = sum(scores.values()) or 1
        best_domain = max(scores, key=scores.get)
        confidence = round(scores[best_domain] / total, 4)
        all_scores = {d: round(v / total, 4) for d, v in scores.items()}
        return {
            "domain": best_domain if scores[best_domain] > 0 else "Unknown",
            "confidence": confidence,
            "related_concepts": self._domain_concepts.get(best_domain, [])[:5],
            "all_domain_scores": all_scores,
            "method": "keyword_matching",
        }
