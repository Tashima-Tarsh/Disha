from __future__ import annotations

# mypy: disable-error-code=untyped-decorator
import asyncio
import json
import uuid
from typing import Any

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from disha.ai.core.cognitive_loop import CognitiveEngine

logger = structlog.get_logger("cognitive_api")

router = APIRouter()
_engine = CognitiveEngine()


class ProcessRequest(BaseModel):
    input: str
    session_id: str | None = None


class ProcessResponse(BaseModel):
    session_id: str
    turn: int
    intent: str
    confidence: float
    action: dict[str, Any]
    reflection: dict[str, Any] | None
    stage_durations: dict[str, float]


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "engine": "DISHA-MIND", "version": "1.0.0"}


@router.post("/process", response_model=ProcessResponse)
async def process_input(req: ProcessRequest) -> ProcessResponse:
    state = await _engine.process(req.input, session_id=req.session_id)
    return ProcessResponse(
        session_id=state.session_id,
        turn=state.turn,
        intent=state.intent,
        confidence=state.confidence,
        action=state.action or {},
        reflection=state.reflection,
        stage_durations=state.stage_durations,
    )


@router.get("/introspect/{session_id}")
async def introspect(session_id: str) -> dict[str, Any]:
    return _engine.get_introspection_report(session_id)


@router.get("/sessions")
async def sessions() -> dict[str, list[str]]:
    return {"session_ids": _engine.get_session_ids()}


STAGE_ORDER = [
    "perceiving",
    "attending",
    "reasoning",
    "deliberating",
    "acting",
    "reflecting",
    "consolidating",
]


@router.websocket("/cognitive/stream/{session_id}")
async def cognitive_stream(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()
    log = logger.bind(session=session_id)
    log.info("ws_connected")

    try:
        while True:
            raw = await websocket.receive_text()
            payload = json.loads(raw)
            user_input = payload.get("input", "").strip()
            if not user_input:
                continue

            sid = payload.get("session_id", session_id) or str(uuid.uuid4())

            await _stream_cognitive_cycle(websocket, user_input, sid)

    except WebSocketDisconnect:
        log.info("ws_disconnected")
    except Exception as exc:
        log.error("ws_error", error=str(exc))
        try:
            await websocket.send_json({"stage": "error", "data": {"error": str(exc)}})
        except Exception:
            pass


async def _stream_cognitive_cycle(
    ws: WebSocket, raw_input: str, session_id: str
) -> None:
    import time

    from disha.ai.core.cognitive_loop import CognitiveState

    turn = len(_engine._traces.get(session_id, []))
    state = CognitiveState(session_id=session_id, turn=turn, raw_input=raw_input)

    stage_map = {
        "perceive": ("perceiving", _engine._perceive),
        "attend": ("attending", _engine._attend),
        "reason": ("reasoning", _engine._reason),
        "deliberate": ("deliberating", _engine._deliberate),
        "act": ("acting", _engine._act),
        "reflect": ("reflecting", _engine._reflect),
        "consolidate": ("consolidating", _engine._consolidate),
    }

    import structlog

    log = structlog.get_logger("cognitive_stream").bind(session=session_id, turn=turn)
    log.info("stream_cycle_start", input_preview=raw_input[:80])

    for internal_name, (stage_name, stage_fn) in stage_map.items():
        t0 = time.perf_counter()
        try:
            await stage_fn(state)
        except Exception as exc:
            log.error("stage_failed", stage=stage_name, error=str(exc))
            state.learning_triggers.append(f"stage_error:{internal_name}")

        duration = round(time.perf_counter() - t0, 4)
        state.stage_durations[internal_name] = duration

        payload = _stage_payload(stage_name, state)
        payload["duration"] = duration

        await ws.send_json({"stage": stage_name, "data": payload})
        await asyncio.sleep(0)

    _engine._traces.setdefault(session_id, []).append(state)

    await ws.send_json(
        {
            "stage": "complete",
            "data": {
                "session_id": session_id,
                "turn": turn,
                "intent": state.intent,
                "confidence": state.confidence,
                "action": state.action,
                "reflection": state.reflection,
                "stage_durations": state.stage_durations,
            },
        }
    )


def _stage_payload(stage: str, state: Any) -> dict[str, Any]:
    if stage == "perceiving":
        return {
            "intent": state.intent,
            "entities": state.entities,
            "uncertainty": state.uncertainty,
        }
    if stage == "attending":
        return {
            "working_memory": [
                {
                    "content": str(m.get("content", ""))[:80],
                    "relevance": m.get("relevance", 0),
                }
                if isinstance(m, dict)
                else {"content": str(m)[:80], "relevance": 0.5}
                for m in state.working_memory[:8]
            ],
            "recalled_episodes": len(state.recalled_episodes),
            "recalled_concepts": len(state.recalled_concepts),
        }
    if stage == "reasoning":
        return {
            "hypotheses": state.hypotheses,
            "selected": state.selected_hypothesis,
        }
    if stage == "deliberating":
        return {
            "all_opinions": state.agent_deliberations,
            "consensus": state.consensus,
            "dissenting_view": state.dissenting_view,
        }
    if stage == "acting":
        return {"action": state.action, "confidence": state.confidence}
    if stage == "reflecting":
        return {
            "quality": (state.reflection or {}).get("quality", 0),
            "triggers": state.learning_triggers,
            "factors": (state.reflection or {}).get("factors", {}),
        }
    if stage == "consolidating":
        return {
            "episodes_stored": state.consolidated_episodes,
            "concepts_learned": state.new_concepts_learned,
        }
    return {}
