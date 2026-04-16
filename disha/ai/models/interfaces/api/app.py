"""FastAPI application factory for the Disha AI platform.

If :pypi:`fastapi` is not installed, :func:`create_app` returns ``None``.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    _HAS_FASTAPI = True
except ImportError:  # pragma: no cover
    _HAS_FASTAPI = False
    FastAPI = None  # type: ignore[assignment,misc]


def create_app() -> Optional[Any]:
    """Create and configure a FastAPI application.

    Returns:
        A :class:`fastapi.FastAPI` instance, or ``None`` when FastAPI is not
        installed.
    """
    if not _HAS_FASTAPI or FastAPI is None:
        logger.warning("FastAPI is not installed – cannot create application")
        return None

    app = FastAPI(
        title="Disha AI Platform",
        description="Unified AI simulation, reasoning, and geospatial API",
        version="1.0.0",
    )

    # -- CORS -------------------------------------------------------------- #
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # -- Mount API routes -------------------------------------------------- #
    from .routes import router as api_router  # noqa: WPS433 (nested import)

    app.include_router(api_router)

    # -- Health check ------------------------------------------------------ #
    @app.get("/health", tags=["health"])
    async def health_check() -> Dict[str, str]:
        """Simple liveness probe."""
        return {"status": "healthy"}

    # -- Lifecycle events -------------------------------------------------- #
    @app.on_event("startup")
    async def _on_startup() -> None:
        logger.info("Disha AI Platform starting up")

    @app.on_event("shutdown")
    async def _on_shutdown() -> None:
        logger.info("Disha AI Platform shutting down")

    return app
