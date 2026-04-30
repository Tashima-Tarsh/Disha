from __future__ import annotations

from ..config import settings
from .models import ModuleHealth
from .probes import probe_http_json


async def collect_external_modules_health() -> list[ModuleHealth]:
    # These are optional. DISHA Brain must degrade gracefully when they are down.
    modules: list[ModuleHealth] = []

    # AI platform backend
    ok, reason = await probe_http_json(f"{settings.ai_platform_url.rstrip('/')}/health")
    modules.append(
        ModuleHealth(
            name="ai_platform",
            status="ok" if ok else "down",
            reason=reason if not ok else "",
            target=settings.ai_platform_url,
        )
    )

    # MCP HTTP/SSE server
    ok, reason = await probe_http_json(f"{settings.mcp_http_url.rstrip('/')}/health")
    modules.append(
        ModuleHealth(
            name="mcp_server",
            status="ok" if ok else "down",
            reason=reason if not ok else "",
            target=settings.mcp_http_url,
        )
    )

    # Quantum physics backend
    ok, reason = await probe_http_json(f"{settings.physics_url.rstrip('/')}/")
    modules.append(
        ModuleHealth(
            name="quantum_physics",
            status="ok" if ok else "down",
            reason=reason if not ok else "",
            target=settings.physics_url,
        )
    )

    # OpenCanary honeypot HTTP (used as a representative cyber-defense probe)
    ok, reason = await probe_http_json(f"{settings.opencanary_url.rstrip('/')}/")
    modules.append(
        ModuleHealth(
            name="cyber_defense_opencanary",
            status="ok" if ok else "down",
            reason=reason if not ok else "",
            target=settings.opencanary_url,
        )
    )

    return modules
