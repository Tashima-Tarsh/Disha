from fastapi import APIRouter
from app.api.v1.routers import auth, investigate, multimodal, rl, ranking, osint_stream, physics
from app.models.schemas import HealthResponse
from app.core.config import get_settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    settings = get_settings()
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        services={
            "api": "running",
            "agents": "ready",
        },
    )

router.include_router(auth.router, tags=["auth"])
router.include_router(investigate.router, tags=["investigate"])
router.include_router(multimodal.router, tags=["multimodal"])
router.include_router(rl.router, tags=["rl"])
router.include_router(ranking.router, tags=["ranking"])
router.include_router(osint_stream.router, prefix="/osint-stream", tags=["osint"])
router.include_router(physics.router, prefix="/physics", tags=["physics"])
