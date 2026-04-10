"""API v1 endpoints for the AI Intelligence Platform."""

from typing import Any

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, status

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
    Alert,
)
from app.services.alerts.alert_manager import AlertManager, ConnectionManager
from app.services.graph.knowledge_graph import KnowledgeGraph
from app.services.memory.vector_store import VectorStore
from app.core.config import get_settings

router = APIRouter()

# Shared instances
connection_manager = ConnectionManager()
alert_manager = AlertManager(connection_manager)
orchestrator = Orchestrator()
vector_store = VectorStore()
knowledge_graph = KnowledgeGraph()

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
    query: str,
    limit: int = 5,
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
async def websocket_alerts(websocket: WebSocket):
    """WebSocket endpoint for real-time alerts."""
    await connection_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back acknowledgment
            await websocket.send_json({"type": "ack", "message": data})
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
