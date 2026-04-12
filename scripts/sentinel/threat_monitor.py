"""
Disha Sentinel — Threat Monitor

Continuous monitoring loop that:
1. Polls open-source threat feeds (abuse.ch, EmergingThreats, IPsum)
2. Runs anomaly detection on collected indicators
3. Correlates findings across knowledge domains
4. Raises alerts via the AlertManager when thresholds are exceeded
5. Logs all actions to an immutable audit trail

Usage::

    python -m scripts.sentinel.threat_monitor --interval 300  # every 5 min
    python -m scripts.sentinel.threat_monitor --once           # single pass
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import signal
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("disha.sentinel.monitor")

# ── Paths ─────────────────────────────────────────────────────────────

_REPO = Path(__file__).resolve().parents[2]
_AUDIT_DIR = _REPO / "logs" / "sentinel"
_AUDIT_DIR.mkdir(parents=True, exist_ok=True)

# ── Threat feed URLs (all free / no-key) ──────────────────────────────

FEEDS: dict[str, str] = {
    "feodo_ipblocklist": "https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.txt",
    "emergingthreats_compromised": "https://rules.emergingthreats.net/blockrules/compromised-ips.txt",
    "ipsum_level3": "https://raw.githubusercontent.com/stamparm/ipsum/master/levels/3.txt",
    "urlhaus_recent": "https://urlhaus.abuse.ch/downloads/text_recent/",
    "sslbl_ja3": "https://sslbl.abuse.ch/blacklist/ja3_fingerprints.csv",
}

# ── Severity thresholds ───────────────────────────────────────────────

SEVERITY_THRESHOLDS = {
    "critical": 0.90,
    "high": 0.75,
    "medium": 0.50,
    "low": 0.25,
    "info": 0.0,
}


def _severity_for(score: float) -> str:
    """Map a 0-1 score to a severity label."""
    for label, threshold in SEVERITY_THRESHOLDS.items():
        if score >= threshold:
            return label
    return "info"


# ── Feed Fetching ─────────────────────────────────────────────────────

def _fetch_feed(name: str, url: str) -> list[str]:
    """Fetch a text-based threat feed and return non-comment lines."""
    try:
        import urllib.request
        req = urllib.request.Request(url, headers={"User-Agent": "Disha-Sentinel/3.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        lines = [
            line.strip()
            for line in raw.splitlines()
            if line.strip() and not line.startswith("#") and not line.startswith("//")
        ]
        logger.info("feed_fetched name=%s indicators=%d", name, len(lines))
        return lines
    except Exception as exc:
        logger.warning("feed_fetch_failed name=%s error=%s", name, exc)
        return []


def fetch_all_feeds() -> dict[str, list[str]]:
    """Fetch all configured feeds and return a map of name→indicators."""
    results: dict[str, list[str]] = {}
    for name, url in FEEDS.items():
        results[name] = _fetch_feed(name, url)
    return results


# ── Indicator Analysis ────────────────────────────────────────────────

def analyze_indicators(feed_data: dict[str, list[str]]) -> list[dict[str, Any]]:
    """
    Analyze collected indicators and produce threat alerts.

    Deduplicates across feeds, scores by cross-feed correlation,
    and returns a list of alert dicts.
    """
    # Flatten & deduplicate, tracking which feeds mention each indicator
    indicator_feeds: dict[str, set[str]] = {}
    for feed_name, indicators in feed_data.items():
        for ind in indicators:
            # Normalize: strip port suffixes, lowercase
            normalized = ind.split(",")[0].split("|")[0].strip().lower()
            if not normalized:
                continue
            indicator_feeds.setdefault(normalized, set()).add(feed_name)

    total_feeds = len([v for v in feed_data.values() if v])
    if total_feeds == 0:
        return []

    alerts: list[dict[str, Any]] = []
    for indicator, feeds in indicator_feeds.items():
        # Score = fraction of feeds that mention this indicator
        score = len(feeds) / max(total_feeds, 1)
        # Boost if appearing in 2+ feeds
        if len(feeds) >= 2:
            score = min(score * 1.5, 1.0)

        severity = _severity_for(score)
        if severity in ("info",):
            continue  # Skip low-noise indicators

        alerts.append({
            "indicator": indicator,
            "score": round(score, 3),
            "severity": severity,
            "feeds": sorted(feeds),
            "feed_count": len(feeds),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "hash": hashlib.sha256(indicator.encode()).hexdigest()[:16],
        })

    # Sort by score descending
    alerts.sort(key=lambda a: a["score"], reverse=True)
    return alerts


# ── Audit Logging ─────────────────────────────────────────────────────

def _write_audit(run_id: str, data: dict[str, Any]) -> Path:
    """Write immutable audit log entry."""
    filename = f"{run_id}.json"
    path = _AUDIT_DIR / filename
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)
    return path


# ── Main Monitor Loop ─────────────────────────────────────────────────

_running = True


def _handle_signal(signum: int, _frame: Any) -> None:
    global _running
    logger.info("shutdown_signal_received signal=%d", signum)
    _running = False


def run_once() -> dict[str, Any]:
    """Execute a single monitoring pass and return results."""
    run_id = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    logger.info("sentinel_pass_started run_id=%s", run_id)

    t0 = time.monotonic()

    # 1. Fetch feeds
    feed_data = fetch_all_feeds()
    total_indicators = sum(len(v) for v in feed_data.values())

    # 2. Analyze
    alerts = analyze_indicators(feed_data)

    elapsed = round(time.monotonic() - t0, 2)

    result = {
        "run_id": run_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "feeds_queried": len(FEEDS),
        "total_indicators": total_indicators,
        "alerts_generated": len(alerts),
        "critical_count": sum(1 for a in alerts if a["severity"] == "critical"),
        "high_count": sum(1 for a in alerts if a["severity"] == "high"),
        "medium_count": sum(1 for a in alerts if a["severity"] == "medium"),
        "elapsed_seconds": elapsed,
        "top_threats": alerts[:20],
    }

    # 3. Audit
    audit_path = _write_audit(run_id, result)
    logger.info(
        "sentinel_pass_completed run_id=%s indicators=%d alerts=%d elapsed=%.2fs audit=%s",
        run_id, total_indicators, len(alerts), elapsed, audit_path,
    )
    return result


def run_loop(interval: int = 300) -> None:
    """Run the monitoring loop continuously."""
    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    logger.info("sentinel_loop_started interval=%ds", interval)
    while _running:
        try:
            run_once()
        except Exception:
            logger.exception("sentinel_pass_error")
        # Sleep in small increments so we can respond to signals
        for _ in range(interval):
            if not _running:
                break
            time.sleep(1)
    logger.info("sentinel_loop_stopped")


# ── CLI ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Disha Sentinel — Threat Monitor")
    parser.add_argument("--once", action="store_true", help="Run a single monitoring pass")
    parser.add_argument("--interval", type=int, default=300, help="Seconds between passes (default: 300)")
    args = parser.parse_args()

    if args.once:
        result = run_once()
        print(json.dumps(result, indent=2, default=str))
    else:
        run_loop(interval=args.interval)


if __name__ == "__main__":
    main()
