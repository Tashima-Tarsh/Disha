from fastapi import APIRouter, Depends

from app.api.deps import (
    get_audio_agent,
    get_multimodal_fusion,
    get_orchestrator,
    get_vision_agent,
)
from app.core.security import get_current_user
from app.models.schemas import (
    AudioAnalysisRequest,
    MultimodalRequest,
    VisionAnalysisRequest,
)

router = APIRouter()


@router.post("/analyze/vision")
async def analyze_vision(
    request: VisionAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    vision_agent=Depends(get_vision_agent),
):
    context = {
        "analysis_type": request.analysis_type,
        "image_data": request.image_data,
    }
    return await vision_agent.run(request.target, context)


@router.post("/analyze/audio")
async def analyze_audio(
    request: AudioAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    audio_agent=Depends(get_audio_agent),
):
    context = {
        "analysis_type": request.analysis_type,
        "audio_data": request.audio_data,
        "language": request.language,
    }
    return await audio_agent.run(request.target, context)


@router.post("/analyze/multimodal")
async def analyze_multimodal(
    request: MultimodalRequest,
    current_user: dict = Depends(get_current_user),
    orchestrator=Depends(get_orchestrator),
    vision_agent=Depends(get_vision_agent),
    audio_agent=Depends(get_audio_agent),
    multimodal_fusion=Depends(get_multimodal_fusion),
):
    text_results, vision_results, audio_results = None, None, None

    if request.text_target or request.target:
        text_target = request.text_target or request.target
        text_results = await orchestrator.investigate(
            target=text_target,
            investigation_type=request.investigation_type.value,
            depth=2,
            user_id=current_user["user_id"],
        )

    if request.image_url or request.image_data:
        img_target = request.image_url or request.target
        vision_results = await vision_agent.run(
            img_target, {"analysis_type": "classify", "image_data": request.image_data}
        )

    if request.audio_url or request.audio_data:
        aud_target = request.audio_url or request.target
        audio_results = await audio_agent.run(
            aud_target,
            {"analysis_type": "transcribe", "audio_data": request.audio_data},
        )

    return multimodal_fusion.fuse(
        text_results=text_results,
        vision_results=vision_results,
        audio_results=audio_results,
    )
