"""
OSINT feed client — query public RSS/JSON sources for threat indicators.

By default operates in mock mode (returns empty results).  Set
``DISHA_OSINT_ENABLED=1`` and provide feed URLs via ``DISHA_OSINT_FEEDS``
(comma-separated) to enable live queries.

Rate limiting is enforced: at most one request per feed per 60 seconds.
"""
from __future__ import annotations

import os
import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse


_IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_URL_RE = re.compile(r"https?://[^\s<>\"']+")


class OSINTClient:
    """Configurable OSINT feed client with mock-mode default."""

    def __init__(
        self,
        enabled: Optional[bool] = None,
        feeds: Optional[List[str]] = None,
        rate_limit_seconds: int = 60,
    ):
        if enabled is not None:
            self.enabled = enabled
        else:
            self.enabled = os.environ.get("DISHA_OSINT_ENABLED", "0") == "1"

        if feeds is not None:
            self.feeds = feeds
        else:
            raw = os.environ.get("DISHA_OSINT_FEEDS", "")
            self.feeds = [f.strip() for f in raw.split(",") if f.strip()]

        self.rate_limit_seconds = rate_limit_seconds
        self._last_fetch: Dict[str, float] = {}

    def fetch(self, query: str = "") -> List[Dict[str, Any]]:
        """Fetch indicators from configured feeds.

        Returns a list of dicts with keys: type, value, source.
        In mock mode (default) returns an empty list.
        """
        if not self.enabled:
            return []

        results: List[Dict[str, Any]] = []
        for feed_url in self.feeds:
            now = time.time()
            last = self._last_fetch.get(feed_url, 0.0)
            if now - last < self.rate_limit_seconds:
                continue
            self._last_fetch[feed_url] = now

            try:
                items = self._fetch_feed(feed_url)
                results.extend(items)
            except Exception:
                continue

        return results

    @staticmethod
    def _fetch_feed(url: str) -> List[Dict[str, Any]]:
        """Fetch and parse a single feed URL."""
        import urllib.request

        with urllib.request.urlopen(url, timeout=10) as resp:
            body = resp.read().decode("utf-8", errors="replace")

        items: List[Dict[str, Any]] = []
        for ip in _IP_RE.findall(body):
            items.append({"type": "ip", "value": ip, "source": url})
        for found_url in _URL_RE.findall(body):
            parsed = urlparse(found_url)
            if parsed.hostname and parsed.hostname not in ("", url):
                items.append({"type": "url", "value": found_url, "source": url})
        return items
