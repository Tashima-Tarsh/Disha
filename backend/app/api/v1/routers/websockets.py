from app.api.deps import get_alert_manager, get_connection_manager
from app.core.security import decode_token, get_current_user
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.get("/alerts")
async def get_alerts(
    limit: int = 50,
    level: str | None = None,
    current_user: dict = Depends(get_current_user),
    alert_manager=Depends(get_alert_manager),
):
    return {"alerts": alert_manager.get_alerts(limit=limit, level=level)}


@router.websocket("/ws/alerts")
async def websocket_alerts(
    websocket: WebSocket,
    token: str | None = None,
    connection_manager=Depends(get_connection_manager),
):
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
