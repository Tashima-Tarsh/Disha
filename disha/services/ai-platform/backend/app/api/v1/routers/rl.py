from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models.schemas import FeedbackRequest
from app.rl.reward import InvestigationFeedback
from app.api.deps import get_reward_computer, get_policy_network, get_prompt_optimizer

router = APIRouter()

@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    current_user: dict = Depends(get_current_user),
    reward_computer=Depends(get_reward_computer),
    policy_network=Depends(get_policy_network)
):
    feedback = InvestigationFeedback(
        investigation_id=request.investigation_id,
        true_positive=request.true_positive,
        user_rating=request.user_rating,
        actionable_findings=request.actionable_findings,
    )

    reward = reward_computer.compute_episode_reward(
        investigation_result={"investigation_id": request.investigation_id},
        feedback=feedback,
    )
    update_metrics = policy_network.update()

    return {
        "feedback_recorded": True,
        "reward": round(reward, 4),
        "policy_update": update_metrics,
    }

@router.get("/rl/metrics")
async def rl_metrics(
    current_user: dict = Depends(get_current_user),
    reward_computer=Depends(get_reward_computer),
    prompt_optimizer=Depends(get_prompt_optimizer)
):
    return {
        "reward_metrics": reward_computer.get_metrics(),
        "prompt_metrics": prompt_optimizer.get_metrics(),
    }

@router.post("/rl/evolve-prompts")
async def evolve_prompts(
    current_user: dict = Depends(get_current_user),
    prompt_optimizer=Depends(get_prompt_optimizer)
):
    prompt_optimizer.evolve()
    return prompt_optimizer.get_metrics()
