import asyncio
from contextlib import asynccontextmanager

from app.api.v1.endpoints import router as v1_router
from app.core.config import get_settings
from app.core.logging import setup_logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    setup_logging(debug=settings.DEBUG)

    from app.services.streaming.osint_emitter import OSINTFeedEmitter
    from app.services.streaming.osint_processor import OSINTStreamProcessor

    emitter = OSINTFeedEmitter()
    processor = OSINTStreamProcessor()

    emitter_task = asyncio.create_task(emitter.start())
    processor_task = asyncio.create_task(processor.start())

    yield

    await emitter.stop()
    await processor.stop()
    emitter_task.cancel()
    processor_task.cancel()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Multi-agent AI Intelligence Platform for OSINT, cybersecurity, and blockchain analysis",
        lifespan=lifespan,
    )

    from app.core.middleware.security import SentinelSecurityMiddleware

    app.add_middleware(SentinelSecurityMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )

    app.include_router(v1_router, prefix=settings.API_PREFIX)

    return app


app = create_app()
