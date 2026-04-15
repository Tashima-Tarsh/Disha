"""FastAPI application entry point for the AI Intelligence Platform."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import router as v1_router
from app.core.config import get_settings
from app.core.logging import setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    settings = get_settings()
    setup_logging(debug=settings.DEBUG)

    # DISHA v5.1 Real-time OSINT Feeds
    from app.services.streaming.osint_emitter import OSINTFeedEmitter
    from app.services.streaming.osint_processor import OSINTStreamProcessor

    emitter = OSINTFeedEmitter()
    processor = OSINTStreamProcessor()

    # Start background workers
    emitter_task = asyncio.create_task(emitter.start())
    processor_task = asyncio.create_task(processor.start())

    yield

    # Shutdown logic
    await emitter.stop()
    await processor.stop()
    emitter_task.cancel()
    processor_task.cancel()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Multi-agent AI Intelligence Platform for OSINT, cybersecurity, and blockchain analysis",
        lifespan=lifespan,
    )

    # Internal Security Monitoring
    from app.core.middleware.security import SentinelSecurityMiddleware
    app.add_middleware(SentinelSecurityMiddleware)

    # CORS middleware — origins are read from CORS_ORIGINS env var
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )

    # Register API routes
    app.include_router(v1_router, prefix=settings.API_PREFIX)

    return app


app = create_app()
