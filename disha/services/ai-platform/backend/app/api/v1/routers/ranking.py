from app.api.deps import get_cluster_coordinator, get_intelligence_ranker
from app.core.security import get_current_user
from app.models.schemas import CollaborativeRequest, RankingRequest
from fastapi import APIRouter, Depends

router = APIRouter()


def _register_cluster_agents(cluster_coordinator):
    from app.agents.crypto_agent import CryptoAgent
    from app.agents.detection_agent import DetectionAgent
    from app.agents.graph_agent import GraphAgent
    from app.agents.osint_agent import OSINTAgent
    from app.agents.reasoning_agent import ReasoningAgent
    from app.api.deps import get_audio_agent, get_vision_agent

    cluster_coordinator.register_agent(
        "osint", OSINTAgent(), ["osint", "dns", "shodan", "reconnaissance"]
    )
    cluster_coordinator.register_agent(
        "crypto", CryptoAgent(), ["blockchain", "ethereum", "wallet", "transactions"]
    )
    cluster_coordinator.register_agent(
        "detection", DetectionAgent(), ["anomaly", "detection", "ml"]
    )
    cluster_coordinator.register_agent(
        "graph", GraphAgent(), ["graph", "neo4j", "relationships"]
    )
    cluster_coordinator.register_agent(
        "reasoning", ReasoningAgent(), ["analysis", "llm", "reasoning"]
    )
    cluster_coordinator.register_agent(
        "vision", get_vision_agent(), ["vision", "image"]
    )
    cluster_coordinator.register_agent("audio", get_audio_agent(), ["audio", "speech"])


@router.post("/investigate/collaborative")
async def collaborative_investigate(
    request: CollaborativeRequest,
    current_user: dict = Depends(get_current_user),
    cluster_coordinator=Depends(get_cluster_coordinator),
    intelligence_ranker=Depends(get_intelligence_ranker),
):
    if not cluster_coordinator.nodes:
        _register_cluster_agents(cluster_coordinator)

    task_desc = request.task_description or f"Investigate target: {request.target}"
    result = await cluster_coordinator.collaborative_investigate(
        target=request.target,
        task_description=task_desc,
        context={"depth": request.depth, "user_id": current_user["user_id"]},
    )
    intelligence_ranker.index_entities_from_investigation(result)
    return result


@router.get("/cluster/status")
async def cluster_status(
    current_user: dict = Depends(get_current_user),
    cluster_coordinator=Depends(get_cluster_coordinator),
):
    if not cluster_coordinator.nodes:
        _register_cluster_agents(cluster_coordinator)
    return cluster_coordinator.get_cluster_status()


@router.post("/rankings/entities")
async def get_entity_rankings(
    request: RankingRequest,
    current_user: dict = Depends(get_current_user),
    intelligence_ranker=Depends(get_intelligence_ranker),
):
    rankings = intelligence_ranker.get_rankings(
        top_n=request.top_n,
        entity_type=request.entity_type,
        min_score=request.min_score,
    )
    return {"rankings": rankings, "total": len(rankings)}


@router.get("/rankings/agents")
async def get_agent_rankings(
    current_user: dict = Depends(get_current_user),
    intelligence_ranker=Depends(get_intelligence_ranker),
):
    return {
        "agent_rankings": intelligence_ranker.get_agent_rankings(),
        "metrics": intelligence_ranker.get_metrics(),
    }


@router.post("/rankings/record-outcome")
async def record_agent_outcome(
    agent_name: str,
    true_positive: bool,
    investigation_time: float,
    current_user: dict = Depends(get_current_user),
    intelligence_ranker=Depends(get_intelligence_ranker),
):
    intelligence_ranker.record_agent_outcome(
        agent_name=agent_name,
        true_positive=true_positive,
        investigation_time=investigation_time,
    )
    return {"recorded": True}
