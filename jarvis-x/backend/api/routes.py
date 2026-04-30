from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends

from brain.anomaly import AnomalyDetector
from brain.decision import DecisionEngine
from brain.executor import Executor
from brain.intelligence import IntelligenceBrain
from brain.memory import MemoryBrain
from brain.planner import Planner
from brain.reasoning import ReasoningBrain
from brain.risk_engine import RiskEngine
from database.store import SQLiteStore
from models.schemas import (
    CommandResponse,
    DecisionAction,
    HealthResponse,
    MemoryItem,
    RiskLevel,
    TelemetryEvent,
    UserCommand,
)
from monitoring.service import MonitoringService
from security.auth import require_api_token
from security.policy import SecurityPolicy


class AppContext:
    def __init__(self) -> None:
        self.store = SQLiteStore()
        self.policy = SecurityPolicy()
        self.reasoning = ReasoningBrain()
        self.planner = Planner()
        self.intelligence = IntelligenceBrain()
        self.memory = MemoryBrain(self.store)
        self.executor = Executor(self.store, self.policy)
        self.anomaly = AnomalyDetector()
        self.risk_engine = RiskEngine()
        self.decision_engine = DecisionEngine()
        self.monitoring: MonitoringService | None = None


context = AppContext()
router = APIRouter(prefix="/api/v1")


def get_context() -> AppContext:
    return context


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version="1.0.0", websocket_path="/ws/alerts")


@router.post("/command", response_model=CommandResponse, dependencies=[Depends(require_api_token)])
async def process_command(command: UserCommand, app: AppContext = Depends(get_context)) -> CommandResponse:
    request_id = str(uuid.uuid4())
    risk_level, decision, reasons = app.policy.classify_command(command)

    memory_rows = app.memory.recall(command.user_id)
    plan = app.planner.refine(app.reasoning.create_plan(command, memory_rows))
    explanation = app.intelligence.explain(plan, len(memory_rows))

    results = []
    if decision is DecisionAction.allow:
        results = app.executor.execute(plan)
        app.memory.remember(
            user_id=command.user_id,
            kind="interaction",
            content=command.text,
            metadata={"request_id": request_id, "intent": plan.intent},
        )
    elif decision is DecisionAction.ask:
        explanation = f"{explanation} Confirmation required before execution."
    else:
        explanation = f"{explanation} Request blocked by security policy."

    app.store.add_event(
        event_type="command",
        source=command.device_id,
        payload={
            "request_id": request_id,
            "text": command.text,
            "risk": risk_level.value,
            "decision": decision.value,
            "reasons": reasons,
        },
    )

    return CommandResponse(
        request_id=request_id,
        plan=plan,
        risk=risk_level,
        decision=decision,
        explanation=explanation,
        results=results,
    )


@router.get("/memory", dependencies=[Depends(require_api_token)])
async def list_memory(user_id: str = "local-user", app: AppContext = Depends(get_context)) -> list[dict]:
    return app.memory.recall(user_id=user_id, limit=20)


@router.post("/memory", dependencies=[Depends(require_api_token)])
async def add_memory(item: MemoryItem, app: AppContext = Depends(get_context)) -> dict[str, str]:
    app.memory.remember(item.user_id, item.kind, item.content, item.metadata)
    return {"status": "stored"}


@router.post("/telemetry", dependencies=[Depends(require_api_token)])
async def ingest_telemetry(event: TelemetryEvent, app: AppContext = Depends(get_context)) -> dict[str, object]:
    app.store.add_telemetry(event)
    recent = app.store.recent_telemetry(device_id=event.device_id)
    anomaly = app.anomaly.assess(event, recent[:-1])
    assessment = app.risk_engine.assess(event, anomaly)
    action, summary = app.decision_engine.decide(assessment)

    event_id = str(
        app.store.add_event(
            event_type="telemetry",
            source=event.device_id,
            payload={
                "telemetry": event.model_dump(),
                "anomaly": anomaly.model_dump(),
                "assessment": assessment.model_dump(),
            },
        )
    )
    app.store.add_risk_log(
        user_id=event.user_id,
        device_id=event.device_id,
        risk_level=assessment.level.value,
        score=assessment.score,
        action=action.value,
        reasons=assessment.reasons,
    )
    if app.monitoring and assessment.level is not RiskLevel.low:
        await app.monitoring.emit_alert(event_id, event, assessment)

    return {
        "status": "accepted",
        "event_id": event_id,
        "anomaly": anomaly.model_dump(),
        "risk": assessment.model_dump(),
        "decision": action.value,
        "summary": summary,
    }


@router.get("/events", dependencies=[Depends(require_api_token)])
async def latest_events(app: AppContext = Depends(get_context)) -> list[dict]:
    return app.store.recent_telemetry(device_id="desktop", limit=20)
