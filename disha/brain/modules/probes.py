from __future__ import annotations

import httpx


async def probe_http_json(url: str, timeout_s: float = 2.5) -> tuple[bool, str]:
    try:
        async with httpx.AsyncClient(
            timeout=timeout_s, follow_redirects=True
        ) as client:
            resp = await client.get(url)
            if resp.status_code >= 400:
                return False, f"HTTP {resp.status_code}"
            _ = resp.json()
        return True, "ok"
    except Exception as exc:  # intentionally broad for health probing
        return False, str(exc)
