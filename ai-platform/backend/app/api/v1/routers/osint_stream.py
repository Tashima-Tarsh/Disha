from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
import structlog
from app.api.deps import get_connection_manager
from app.core.security import decode_token

router = APIRouter()
logger = structlog.get_logger(__name__)

@router.websocket("/ws")
async def websocket_osint_stream(
    websocket: WebSocket,
    token: str | None = None,
    connection_manager=Depends(get_connection_manager)
):
    """
    WebSocket endpoint for DISHA Real-time Intelligence Pulse.
    Streams live OSINT events from Kafka/Simulation.
    """
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    
    try:
        # Validate session
        decode_token(token)
    except Exception:
        await websocket.close(code=4003, reason="Invalid or expired token")
        return

    await connection_manager.connect(websocket)
    logger.info("osint_stream_connected", client_host=websocket.client.host)
    
    try:
        while True:
            # Keep-alive loop
            await websocket.receive_text()
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
        logger.info("osint_stream_disconnected", client_host=websocket.client.host)

@router.get("/status")
async def get_stream_status():
    """Get the current status of the intelligence stream."""
    return {
        "status": "operational",
        "stream_id": "disha-osint-pulse-v5.1",
        "active_sources": ["CVE-Database", "Global-News-RSS", "DarkWeb-Monitor"]
    }
