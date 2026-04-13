"""API v1 endpoints for the AI Intelligence Platform."""

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, HTTPException, status

from app.agents.orchestrator import Orchestrator
from app.core.security import get_current_user, create_access_token, hash_password, verify_password
from app.models.schemas import (
    InvestigationRequest,
    MultiInvestigationRequest,
    GraphInsightRequest,
    GraphInsightResponse,
    AuthRequest,
    AuthResponse,
    HealthResponse,
    VisionAnalysisRequest,
    AudioAnalysisRequest,
    MultimodalRequest,
    CollaborativeRequest,
    FeedbackRequest,
    RankingRequest,
)
from app.services.alerts.alert_manager import AlertManager, ConnectionManager
from app.services.graph.knowledge_graph import KnowledgeGraph
from app.services.memory.vector_store import VectorStore
from app.core.config import get_settings

# Multimodal agents
from app.multimodal.vision_agent import VisionAgent
from app.multimodal.audio_agent import AudioAgent
from app.multimodal.fusion import MultimodalFusion

# Collaboration
from app.collaboration.coordinator import ClusterCoordinator

# RL system
from app.rl.reward import RewardComputer, InvestigationFeedback
from app.rl.policy import PolicyNetwork
from app.rl.environment import InvestigationEnvironment

# Prompt optimization
from app.prompts.optimizer import PromptOptimizer

# Intelligence ranking
from app.ranking.intelligence_ranker import IntelligenceRanker

router = APIRouter()

# Shared instances
connection_manager = ConnectionManager()
alert_manager = AlertManager(connection_manager)
orchestrator = Orchestrator()
vector_store = VectorStore()
knowledge_graph = KnowledgeGraph()

# New system instances
vision_agent = VisionAgent()
audio_agent = AudioAgent()
multimodal_fusion = MultimodalFusion()
cluster_coordinator = ClusterCoordinator()
reward_computer = RewardComputer()
policy_network = PolicyNetwork()
rl_environment = InvestigationEnvironment()
prompt_optimizer = PromptOptimizer()
intelligence_ranker = IntelligenceRanker()

# Simple in-memory user store for demo (replace with database in production)
_demo_users: dict[str, dict[str, str]] = {}


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


@router.post("/auth/register", response_model=AuthResponse)
async def register(request: AuthRequest):
    """Register a new user."""
    if request.email in _demo_users:
        raise HTTPException(status_code=400, detail="User already exists")

    user_id = f"user-{len(_demo_users) + 1}"
    _demo_users[request.email] = {
        "user_id": user_id,
        "email": request.email,
        "password_hash": hash_password(request.password),
    }

    token = create_access_token({"sub": user_id, "email": request.email})
    return AuthResponse(access_token=token, user_id=user_id)


@router.post("/auth/login", response_model=AuthResponse)
async def login(request: AuthRequest):
    """Authenticate and get access token."""
    user = _demo_users.get(request.email)
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token({"sub": user["user_id"], "email": request.email})
    return AuthResponse(access_token=token, user_id=user["user_id"])


@router.post("/investigate")
async def investigate(
    request: InvestigationRequest,
    current_user: dict = Depends(get_current_user),
):
    """Run an intelligence investigation on a target."""
    result = await orchestrator.investigate(
        target=request.target,
        investigation_type=request.investigation_type.value,
        depth=request.depth,
        options=request.options,
        user_id=current_user["user_id"],
    )

    # Store in vector memory
    await vector_store.store_investigation(
        investigation_id=result["investigation_id"],
        summary=result.get("summary", ""),
        metadata={
            "target": request.target,
            "type": request.investigation_type.value,
            "user_id": current_user["user_id"],
            "risk_score": result.get("risk_score", 0),
        },
    )

    # Generate alerts
    await alert_manager.create_alerts_from_investigation(result)

    return result


@router.post("/multi-investigate")
async def multi_investigate(
    request: MultiInvestigationRequest,
    current_user: dict = Depends(get_current_user),
):
    """Run investigations on multiple targets."""
    results = await orchestrator.multi_investigate(
        targets=request.targets,
        investigation_type=request.investigation_type.value,
        depth=request.depth,
        user_id=current_user["user_id"],
    )
    return {"investigations": results, "count": len(results)}


@router.post("/graph-insights", response_model=GraphInsightResponse)
async def graph_insights(
    request: GraphInsightRequest,
    current_user: dict = Depends(get_current_user),
):
    """Get graph-based intelligence insights."""
    if request.insight_type == "centrality":
        results = await knowledge_graph.get_centrality(limit=request.limit)
        return GraphInsightResponse(insight_type="centrality", results=results)

    elif request.insight_type == "subgraph" and request.entity_id:
        subgraph = await knowledge_graph.get_subgraph(request.entity_id)
        return GraphInsightResponse(
            insight_type="subgraph",
            results=[subgraph],
            metadata={"entity_id": request.entity_id},
        )

    elif request.insight_type == "community":
        # Return centrality as proxy for community detection
        results = await knowledge_graph.get_centrality(limit=request.limit)
        return GraphInsightResponse(insight_type="community", results=results)

    return GraphInsightResponse(insight_type=request.insight_type, results=[])


@router.get("/alerts")
async def get_alerts(
    limit: int = 50,
    level: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    """Get recent alerts."""
    return {"alerts": alert_manager.get_alerts(limit=limit, level=level)}


@router.get("/context")
async def get_context(
    query: str = Query(..., min_length=1, max_length=500),
    limit: int = Query(5, ge=1, le=20),
    current_user: dict = Depends(get_current_user),
):
    """Retrieve relevant context from vector memory."""
    results = await vector_store.get_context(
        query=query,
        user_id=current_user["user_id"],
        limit=limit,
    )
    return {"context": results}


@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket, token: str | None = None):
    """WebSocket endpoint for real-time alerts.

    Requires a valid JWT passed as ?token=<bearer_token> query parameter,
    since WebSocket clients cannot send Authorization headers.
    """
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    try:
        decode_token(token)
    except Exception:
        await websocket.close(code=4003, reason="Invalid or expired token")
        return

    await connection_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "ack", "message": data})
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)


# ============================================================
# Multimodal AGI Endpoints (Vision + Audio)
# ============================================================


@router.post("/analyze/vision")
async def analyze_vision(
    request: VisionAnalysisRequest,
    current_user: dict = Depends(get_current_user),
):
    """Analyze an image for threat intelligence."""
    context = {
        "analysis_type": request.analysis_type,
        "image_data": request.image_data,
    }
    result = await vision_agent.run(request.target, context)
    return result


@router.post("/analyze/audio")
async def analyze_audio(
    request: AudioAnalysisRequest,
    current_user: dict = Depends(get_current_user),
):
    """Analyze audio for threat intelligence."""
    context = {
        "analysis_type": request.analysis_type,
        "audio_data": request.audio_data,
        "language": request.language,
    }
    result = await audio_agent.run(request.target, context)
    return result


@router.post("/analyze/multimodal")
async def analyze_multimodal(
    request: MultimodalRequest,
    current_user: dict = Depends(get_current_user),
):
    """Run fused multimodal analysis combining text, vision, and audio."""
    text_results = None
    vision_results = None
    audio_results = None

    # Text-based investigation
    if request.text_target or request.target:
        text_target = request.text_target or request.target
        text_results = await orchestrator.investigate(
            target=text_target,
            investigation_type=request.investigation_type.value,
            depth=2,
            user_id=current_user["user_id"],
        )

    # Vision analysis
    if request.image_url or request.image_data:
        img_target = request.image_url or request.target
        vision_results = await vision_agent.run(
            img_target,
            {"analysis_type": "classify", "image_data": request.image_data},
        )

    # Audio analysis
    if request.audio_url or request.audio_data:
        aud_target = request.audio_url or request.target
        audio_results = await audio_agent.run(
            aud_target,
            {"analysis_type": "transcribe", "audio_data": request.audio_data},
        )

    # Fuse results
    fused = multimodal_fusion.fuse(
        text_results=text_results,
        vision_results=vision_results,
        audio_results=audio_results,
    )

    return fused


# ============================================================
# Distributed AGI Cluster / Collaborative Investigation
# ============================================================


@router.post("/investigate/collaborative")
async def collaborative_investigate(
    request: CollaborativeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Run a multi-agent collaborative investigation with peer review and consensus."""
    # Register agents if not already done
    if not cluster_coordinator.nodes:
        _register_cluster_agents()

    task_desc = request.task_description or f"Investigate target: {request.target}"

    result = await cluster_coordinator.collaborative_investigate(
        target=request.target,
        task_description=task_desc,
        context={"depth": request.depth, "user_id": current_user["user_id"]},
    )

    # Index entities for ranking
    intelligence_ranker.index_entities_from_investigation(result)

    return result


@router.get("/cluster/status")
async def cluster_status(
    current_user: dict = Depends(get_current_user),
):
    """Get the status of the distributed agent cluster."""
    if not cluster_coordinator.nodes:
        _register_cluster_agents()
    return cluster_coordinator.get_cluster_status()


def _register_cluster_agents():
    """Register all available agents in the cluster coordinator."""
    from app.agents.osint_agent import OSINTAgent
    from app.agents.crypto_agent import CryptoAgent
    from app.agents.detection_agent import DetectionAgent
    from app.agents.graph_agent import GraphAgent
    from app.agents.reasoning_agent import ReasoningAgent

    cluster_coordinator.register_agent(
        "osint", OSINTAgent(), ["osint", "dns", "shodan", "reconnaissance"]
    )
    cluster_coordinator.register_agent(
        "crypto", CryptoAgent(), ["blockchain", "ethereum", "wallet", "transactions"]
    )
    cluster_coordinator.register_agent(
        "detection", DetectionAgent(), ["anomaly", "detection", "ml", "isolation_forest"]
    )
    cluster_coordinator.register_agent(
        "graph", GraphAgent(), ["graph", "neo4j", "relationships", "communities"]
    )
    cluster_coordinator.register_agent(
        "reasoning", ReasoningAgent(), ["analysis", "llm", "reasoning", "risk"]
    )
    cluster_coordinator.register_agent(
        "vision", vision_agent, ["vision", "image", "ocr", "multimodal"]
    )
    cluster_coordinator.register_agent(
        "audio", audio_agent, ["audio", "speech", "transcription", "multimodal"]
    )


# ============================================================
# Reinforcement Learning / Feedback Loop
# ============================================================


@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    current_user: dict = Depends(get_current_user),
):
    """Submit feedback on an investigation for RL training."""
    feedback = InvestigationFeedback(
        investigation_id=request.investigation_id,
        true_positive=request.true_positive,
        user_rating=request.user_rating,
        actionable_findings=request.actionable_findings,
    )

    # Compute episode reward from feedback
    reward = reward_computer.compute_episode_reward(
        investigation_result={"investigation_id": request.investigation_id},
        feedback=feedback,
    )

    # Update policy if enough experience collected
    update_metrics = policy_network.update()

    return {
        "feedback_recorded": True,
        "reward": round(reward, 4),
        "policy_update": update_metrics,
    }


@router.get("/rl/metrics")
async def rl_metrics(
    current_user: dict = Depends(get_current_user),
):
    """Get RL system metrics including reward tracking and policy status."""
    return {
        "reward_metrics": reward_computer.get_metrics(),
        "prompt_metrics": prompt_optimizer.get_metrics(),
    }


@router.post("/rl/evolve-prompts")
async def evolve_prompts(
    current_user: dict = Depends(get_current_user),
):
    """Trigger one generation of prompt evolution."""
    prompt_optimizer.evolve()
    return prompt_optimizer.get_metrics()


# ============================================================
# Intelligence Ranking
# ============================================================


@router.post("/rankings/entities")
async def get_entity_rankings(
    request: RankingRequest,
    current_user: dict = Depends(get_current_user),
):
    """Get ranked intelligence entities by composite score."""
    rankings = intelligence_ranker.get_rankings(
        top_n=request.top_n,
        entity_type=request.entity_type,
        min_score=request.min_score,
    )
    return {"rankings": rankings, "total": len(rankings)}


@router.get("/rankings/agents")
async def get_agent_rankings(
    current_user: dict = Depends(get_current_user),
):
    """Get agent reliability rankings."""
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
):
    """Record an agent's investigation outcome for reliability tracking."""
    intelligence_ranker.record_agent_outcome(
        agent_name=agent_name,
        true_positive=true_positive,
        investigation_time=investigation_time,
    )
    return {"recorded": True}
