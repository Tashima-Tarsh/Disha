"""Optional OSINT client for RSS / JSON threat-intelligence feeds.

This module is *opt-in*: it never fetches data unless explicitly constructed
and called.  All network access uses ``urllib`` from the standard library so
there are no extra dependencies.
"""

from __future__ import annotations

import json
import urllib.request
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional


class OSINTClient:
    """Lightweight aggregator of open-source threat-intel feeds.

    Parameters
    ----------
    feeds:
        List of dicts describing each feed::

            {"name": "Feed-Name", "url": "https://...", "type": "rss"|"json"}

        If *None*, a small default set of public feeds is used.
    timeout:
        HTTP timeout in seconds.
    """

    DEFAULT_FEEDS: List[Dict[str, str]] = [
        {
            "name": "Feodo-Tracker",
            "url": "https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.txt",
            "type": "text",
        },
    ]

    def __init__(
        self,
        feeds: Optional[List[Dict[str, str]]] = None,
        timeout: int = 10,
    ) -> None:
        self.feeds = feeds if feeds is not None else self.DEFAULT_FEEDS
        self.timeout = timeout

    # ------------------------------------------------------------------
    def fetch_all(self) -> List[Dict[str, Any]]:
        """Fetch every configured feed and return structured indicators."""
        indicators: List[Dict[str, Any]] = []
        for feed in self.feeds:
            try:
                items = self._fetch_feed(feed)
                indicators.extend(items)
            except Exception as exc:  # noqa: BLE001
                indicators.append(
                    {
                        "source": feed.get("name", "unknown"),
                        "error": str(exc),
                    }
                )
        return indicators

    # ------------------------------------------------------------------
    def _fetch_feed(self, feed: Dict[str, str]) -> List[Dict[str, Any]]:
        url = feed["url"]
        feed_type = feed.get("type", "json")
        name = feed.get("name", url)

        req = urllib.request.Request(url, headers={"User-Agent": "Disha-OSINT/1.0"})
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")

        if feed_type == "rss":
            return self._parse_rss(raw, name)
        if feed_type == "json":
            return self._parse_json(raw, name)
        return self._parse_text(raw, name)

    # ------------------------------------------------------------------
    @staticmethod
    def _parse_rss(raw: str, source: str) -> List[Dict[str, Any]]:
        root = ET.fromstring(raw)
        items: List[Dict[str, Any]] = []
        for item in root.iter("item"):
            title = item.findtext("title", "")
            link = item.findtext("link", "")
            desc = item.findtext("description", "")
            items.append(
                {
                    "source": source,
                    "title": title,
                    "link": link,
                    "description": desc,
                }
            )
        return items

    @staticmethod
    def _parse_json(raw: str, source: str) -> List[Dict[str, Any]]:
        data = json.loads(raw)
        if isinstance(data, list):
            return [{"source": source, **entry} for entry in data]
        return [{"source": source, "data": data}]

    @staticmethod
    def _parse_text(raw: str, source: str) -> List[Dict[str, Any]]:
        indicators: List[Dict[str, Any]] = []
        for line in raw.splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                indicators.append({"source": source, "indicator": line})
        return indicators
