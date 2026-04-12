"""Perception Layer — Sensory input processing for the cognitive architecture.

Transforms raw inputs into structured Percepts with salience scoring,
feature extraction, and attention filtering. Inspired by the human
perceptual system: detect → classify → prioritize → attend.
"""

from __future__ import annotations

import hashlib
import logging
import re
from collections import deque
from datetime import datetime, timezone
from typing import Any

from ..types import CognitiveEvent, Percept, PerceptionType

logger = logging.getLogger(__name__)


class AttentionFilter:
    """Filters percepts based on salience and relevance.
    
    Implements a simple attention mechanism that maintains a focus set
    of high-priority percepts, similar to selective attention in cognition.
    """

    def __init__(self, capacity: int = 7, threshold: float = 0.3) -> None:
        """Initialize attention filter.
        
        Args:
            capacity: Maximum percepts in focus (default 7, based on Miller's Law).
            threshold: Minimum salience to enter attention (0.0-1.0).
        """
        self._capacity = capacity
        self._threshold = threshold
        self._focus: deque[Percept] = deque(maxlen=capacity)
        self._seen_hashes: set[str] = set()

    def filter(self, percepts: list[Percept]) -> list[Percept]:
        """Filter percepts by salience, deduplication, and capacity."""
        # Remove duplicates
        unique = []
        for p in percepts:
            content_hash = hashlib.md5(
                str(p.content).encode(), usedforsecurity=False
            ).hexdigest()[:16]
            if content_hash not in self._seen_hashes:
                self._seen_hashes.add(content_hash)
                unique.append(p)

        # Filter by threshold
        above_threshold = [p for p in unique if p.salience >= self._threshold]

        # Sort by salience (highest first) and take top N
        above_threshold.sort(key=lambda p: p.salience, reverse=True)
        result = above_threshold[: self._capacity]

        # Update focus set
        for p in result:
            self._focus.append(p)

        return result

    @property
    def current_focus(self) -> list[Percept]:
        """Return the current attention focus set."""
        return list(self._focus)

    def clear(self) -> None:
        """Reset the attention filter."""
        self._focus.clear()
        self._seen_hashes.clear()


class FeatureExtractor:
    """Extracts structured features from raw input content."""

    @staticmethod
    def extract(content: Any, perception_type: PerceptionType) -> dict[str, Any]:
        """Extract features based on the type of input."""
        if perception_type == PerceptionType.TEXT:
            return FeatureExtractor._extract_text_features(str(content))
        if perception_type == PerceptionType.CODE:
            return FeatureExtractor._extract_code_features(str(content))
        if perception_type == PerceptionType.STRUCTURED_DATA:
            return FeatureExtractor._extract_structured_features(content)
        if perception_type == PerceptionType.EVENT:
            return FeatureExtractor._extract_event_features(content)
        if perception_type == PerceptionType.FEEDBACK:
            return FeatureExtractor._extract_feedback_features(content)
        return {"raw": str(content)[:500]}

    @staticmethod
    def _extract_text_features(text: str) -> dict[str, Any]:
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        return {
            "word_count": len(words),
            "sentence_count": len([s for s in sentences if s.strip()]),
            "avg_word_length": (
                sum(len(w) for w in words) / len(words) if words else 0
            ),
            "has_question": "?" in text,
            "has_urgency": any(
                w.lower() in {"urgent", "critical", "emergency", "asap", "immediately"}
                for w in words
            ),
            "keywords": list(set(
                w.lower() for w in words
                if len(w) > 4 and w.isalpha()
            ))[:20],
        }

    @staticmethod
    def _extract_code_features(code: str) -> dict[str, Any]:
        lines = code.splitlines()
        return {
            "line_count": len(lines),
            "has_imports": any(
                line.strip().startswith(("import ", "from ", "#include", "require", "use "))
                for line in lines
            ),
            "has_functions": bool(re.search(r'\bdef\b|\bfunction\b|\bfn\b|\bfunc\b', code)),
            "has_classes": bool(re.search(r'\bclass\b|\bstruct\b|\binterface\b', code)),
            "has_errors": bool(re.search(r'\berror\b|\bexception\b|\bfail\b', code, re.IGNORECASE)),
            "complexity_hint": "high" if len(lines) > 100 else "medium" if len(lines) > 30 else "low",
        }

    @staticmethod
    def _extract_structured_features(data: Any) -> dict[str, Any]:
        if isinstance(data, dict):
            return {
                "type": "dict",
                "key_count": len(data),
                "keys": list(data.keys())[:20],
                "nested": any(isinstance(v, (dict, list)) for v in data.values()),
            }
        if isinstance(data, list):
            return {
                "type": "list",
                "length": len(data),
                "element_types": list(set(type(item).__name__ for item in data[:10])),
            }
        return {"type": type(data).__name__, "value_preview": str(data)[:200]}

    @staticmethod
    def _extract_event_features(event: Any) -> dict[str, Any]:
        if isinstance(event, dict):
            return {
                "event_type": event.get("type", "unknown"),
                "severity": event.get("severity", "info"),
                "source": event.get("source", "unknown"),
                "has_payload": "payload" in event or "data" in event,
            }
        return {"raw_type": type(event).__name__}

    @staticmethod
    def _extract_feedback_features(feedback: Any) -> dict[str, Any]:
        if isinstance(feedback, dict):
            return {
                "sentiment": feedback.get("sentiment", "neutral"),
                "rating": feedback.get("rating"),
                "actionable": feedback.get("actionable", False),
                "category": feedback.get("category", "general"),
            }
        text = str(feedback).lower()
        positive = any(w in text for w in ["good", "great", "correct", "perfect", "yes"])
        negative = any(w in text for w in ["bad", "wrong", "error", "fail", "no"])
        return {
            "sentiment": "positive" if positive else "negative" if negative else "neutral",
            "text_length": len(text),
        }


class SalienceScorer:
    """Scores the importance/relevance of percepts."""

    def __init__(self, context_keywords: list[str] | None = None) -> None:
        self._context_keywords = set(
            (k.lower() for k in context_keywords) if context_keywords else []
        )
        self._urgency_words = {
            "critical", "urgent", "emergency", "severe", "fatal",
            "error", "failure", "breach", "attack", "vulnerability",
        }

    def score(self, content: Any, perception_type: PerceptionType) -> float:
        """Score salience from 0.0 (irrelevant) to 1.0 (critical)."""
        base_score = 0.3  # Default moderate salience
        text = str(content).lower()

        # Urgency boost
        urgency_matches = sum(1 for w in self._urgency_words if w in text)
        urgency_boost = min(urgency_matches * 0.15, 0.4)

        # Context relevance boost
        context_matches = sum(1 for k in self._context_keywords if k in text)
        context_boost = min(context_matches * 0.1, 0.3)

        # Type-based scoring
        type_weights = {
            PerceptionType.FEEDBACK: 0.1,   # Feedback is always somewhat important
            PerceptionType.EVENT: 0.05,
            PerceptionType.SIGNAL: 0.15,
            PerceptionType.CODE: 0.0,
            PerceptionType.TEXT: 0.0,
            PerceptionType.STRUCTURED_DATA: 0.0,
        }
        type_boost = type_weights.get(perception_type, 0.0)

        # Length factor (very short or very long inputs get slight boost)
        length = len(text)
        length_factor = 0.05 if length < 10 or length > 5000 else 0.0

        return min(base_score + urgency_boost + context_boost + type_boost + length_factor, 1.0)


class PerceptionEngine:
    """Main perception engine — processes raw inputs into structured Percepts.
    
    Pipeline: Receive → Classify → Extract Features → Score Salience → Filter
    
    Example:
        engine = PerceptionEngine(context_keywords=["security", "threat"])
        percepts = engine.perceive("Critical security breach detected in module X")
    """

    def __init__(
        self,
        context_keywords: list[str] | None = None,
        attention_capacity: int = 7,
        salience_threshold: float = 0.3,
    ) -> None:
        self._scorer = SalienceScorer(context_keywords)
        self._extractor = FeatureExtractor()
        self._attention = AttentionFilter(attention_capacity, salience_threshold)
        self._event_log: list[CognitiveEvent] = []

    def perceive(
        self,
        content: Any,
        *,
        source: str = "direct",
        perception_type: PerceptionType | None = None,
    ) -> list[Percept]:
        """Process input into attended percepts.
        
        Args:
            content: Raw input (text, dict, list, code string, etc.)
            source: Origin of the input
            perception_type: Override automatic type classification
            
        Returns:
            List of high-salience percepts that passed attention filtering.
        """
        # Classify input type
        p_type = perception_type or self._classify(content)

        # Extract features
        features = self._extractor.extract(content, p_type)

        # Score salience
        salience = self._scorer.score(content, p_type)

        # Create percept
        percept = Percept(
            perception_type=p_type,
            content=content,
            source=source,
            salience=salience,
            metadata={"features": features},
        )

        # Log cognitive event
        self._event_log.append(CognitiveEvent(
            event_type="perception",
            source_layer="perception",
            payload={
                "percept_id": percept.id,
                "type": p_type.value,
                "salience": salience,
                "source": source,
            },
        ))

        logger.debug(
            "Perceived [%s] salience=%.2f from %s",
            p_type.value, salience, source,
        )

        # Apply attention filter
        return self._attention.filter([percept])

    def perceive_batch(
        self,
        inputs: list[tuple[Any, str]],
    ) -> list[Percept]:
        """Process multiple inputs and return attended percepts.
        
        Args:
            inputs: List of (content, source) tuples.
        """
        all_percepts: list[Percept] = []
        for content, source in inputs:
            p_type = self._classify(content)
            features = self._extractor.extract(content, p_type)
            salience = self._scorer.score(content, p_type)
            percept = Percept(
                perception_type=p_type,
                content=content,
                source=source,
                salience=salience,
                metadata={"features": features},
            )
            all_percepts.append(percept)

        return self._attention.filter(all_percepts)

    @property
    def attention_focus(self) -> list[Percept]:
        """Current items in the attention focus set."""
        return self._attention.current_focus

    @property
    def event_log(self) -> list[CognitiveEvent]:
        """All perception events recorded."""
        return list(self._event_log)

    def reset_attention(self) -> None:
        """Clear the attention filter."""
        self._attention.clear()

    @staticmethod
    def _classify(content: Any) -> PerceptionType:
        """Automatically classify the input type."""
        if isinstance(content, dict):
            if "type" in content or "event" in content:
                return PerceptionType.EVENT
            if "sentiment" in content or "rating" in content or "feedback" in content:
                return PerceptionType.FEEDBACK
            return PerceptionType.STRUCTURED_DATA

        if isinstance(content, (list, tuple)):
            return PerceptionType.STRUCTURED_DATA

        text = str(content)
        # Code detection heuristics
        code_indicators = [
            "def ", "class ", "import ", "function ", "const ", "let ",
            "var ", "return ", "if (", "for (", "while (", "=>",
            "#include", "package ", "public static",
        ]
        if any(indicator in text for indicator in code_indicators):
            if text.count("\n") > 2 or len(text) > 200:
                return PerceptionType.CODE

        return PerceptionType.TEXT
