from fastapi import APIRouter, Depends, Query

from app.api.deps import get_intelligence_service
from app.models.intelligence import IntelligenceResponse
from app.services.intelligence import IntelligenceService

router = APIRouter()


@router.get("/ask", response_model=IntelligenceResponse)
async def ask(
    q: str = Query(..., description="The query to ask the DISHA Intelligence Core"),
    service: IntelligenceService = Depends(get_intelligence_service),
):
    """
    Query the DISHA Intelligence Core for architectural knowledge, OSINT samples, or walkthroughs.
    """
    return await service.get_answer(q)
