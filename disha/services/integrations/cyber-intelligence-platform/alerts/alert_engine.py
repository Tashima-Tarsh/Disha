"""
Disha Alert Engine — Threat alert generation with severity classification.

Generates structured alerts from raw threat records with:
  • Severity classification (critical/high/medium/low/info)
  • Deduplication via content hashing
  • Timestamp and unique ID tracking
  • Integration with the Sentinel monitoring pipeline
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any

alerts_data: list[dict[str, Any]] = []
_seen_hashes: set[str] = set()

# Severity keyword patterns for auto-classification
_SEVERITY_KEYWORDS: dict[str, list[str]] = {
    "critical": [
        "ransomware",
        "zero-day",
        "0day",
        "rce",
        "remote code execution",
        "rootkit",
    ],
    "high": ["malware", "exploit", "backdoor", "c2", "command and control", "botnet"],
    "medium": ["phishing", "suspicious", "anomaly", "brute force", "scan"],
    "low": ["recon", "enumeration", "probe", "info leak"],
}


def _classify_severity(record: dict[str, Any]) -> str:
    """Classify alert severity from record type and text."""
    explicit = record.get("severity")
    if (
        explicit
        and isinstance(explicit, str)
        and explicit.upper() in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO")
    ):
        return explicit.upper()

    text = (record.get("text", "") + " " + record.get("type", "")).lower()
    for severity, keywords in _SEVERITY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return severity.upper()
    return "MEDIUM"


def _content_hash(record: dict[str, Any]) -> str:
    """Generate a dedup hash for a record."""
    key = f"{record.get('type', '')}:{record.get('text', '')}".encode()
    return hashlib.sha256(key).hexdigest()[:16]


def generate_alert(record: dict[str, Any]) -> dict[str, Any] | None:
    """
    Generate a structured alert from a threat record.

    Returns None if the record is a duplicate of an already-seen alert.
    """
    content_hash = _content_hash(record)
    if content_hash in _seen_hashes:
        return None
    _seen_hashes.add(content_hash)

    message = record.get("text", record.get("message", "Unknown threat"))
    severity = _classify_severity(record)

    alert: dict[str, Any] = {
        "alert_id": str(uuid.uuid4()),
        "crime": record.get("type", "unknown"),
        "severity": severity,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": record.get("source", "disha-sentinel"),
        "indicator": record.get("indicator", ""),
        "hash": content_hash,
    }

    alerts_data.append(alert)
    return alert


def get_alerts(limit: int = 100, severity: str | None = None) -> list[dict[str, Any]]:
    """Return recent alerts, optionally filtered by severity."""
    filtered = alerts_data
    if severity:
        filtered = [a for a in filtered if a["severity"] == severity.upper()]
    return filtered[-limit:]


def clear_alerts() -> int:
    """Clear all stored alerts and return count cleared."""
    count = len(alerts_data)
    alerts_data.clear()
    _seen_hashes.clear()
    return count
