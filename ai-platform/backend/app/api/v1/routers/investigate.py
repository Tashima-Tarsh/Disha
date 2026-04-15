from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.models.schemas import InvestigationRequest, MultiInvestigationRequest, GraphInsightRequest, GraphInsightResponse
from app.api.deps import get_orchestrator, get_vector_store, get_alert_manager, get_knowledge_graph

router = APIRouter()

@router.post("/investigate")
async def investigate(
    request: InvestigationRequest,
    current_user: dict = Depends(get_current_user),
    orchestrator = Depends(get_orchestrator),
    vector_store = Depends(get_vector_store),
    alert_manager = Depends(get_alert_manager)
):
    """Run an intelligence investigation on a target."""
    result = await orchestrator.investigate(
        target=request.target,
        investigation_type=request.investigation_type.value,
        depth=request.depth,
        options=request.options,
        user_id=current_user["user_id"],
    )

    await vector_store.store_investigation(
        investigation_id=result.get("investigation_id", ""),
        summary=result.get("summary", ""),
        metadata={
            "target": request.target,
            "type": request.investigation_type.value,
            "user_id": current_user["user_id"],
            "risk_score": result.get("risk_score", 0),
        },
    )

    await alert_manager.create_alerts_from_investigation(result)
    return result

@router.post("/multi-investigate")
async def multi_investigate(
    request: MultiInvestigationRequest,
    current_user: dict = Depends(get_current_user),
    orchestrator = Depends(get_orchestrator)
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
    knowledge_graph = Depends(get_knowledge_graph)
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
        results = await knowledge_graph.get_centrality(limit=request.limit)
        return GraphInsightResponse(insight_type="community", results=results)

    return GraphInsightResponse(insight_type=request.insight_type, results=[])

@router.get("/context")
async def get_context(
    query: str = Query(..., min_length=1, max_length=500),
    limit: int = Query(5, ge=1, le=20),
    current_user: dict = Depends(get_current_user),
    vector_store = Depends(get_vector_store)
):
    """Retrieve relevant context from vector memory."""
    results = await vector_store.get_context(
        query=query,
        user_id=current_user["user_id"],
        limit=limit,
    )
    return {"context": results}
