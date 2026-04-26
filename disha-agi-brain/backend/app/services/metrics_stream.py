import asyncio
import random
import structlog
from datetime import datetime
from typing import AsyncGenerator, Dict, Any

logger = structlog.get_logger("metrics_stream")

class MetricsStreamer:
    """Streams real-time system vitals for the dashboard."""
    
    def __init__(self):
        self.is_active = True

    async def stream_vitals(self) -> AsyncGenerator[Dict[str, Any], None]:
        """Simulates and streams live telemetry data."""
        while self.is_active:
            vitals = {
                "timestamp": datetime.now().isoformat(),
                "cpu_load": round(random.uniform(10, 45), 2),
                "memory_usage": round(random.uniform(200, 1500), 1), # MB
                "ai_tokens_per_sec": round(random.uniform(5, 50), 1),
                "active_agents": random.randint(1, 5),
                "security_threat_level": "low"
            }
            
            logger.info("metrics_emitted", **vitals)
            yield vitals
            await asyncio.sleep(2) # Stream every 2 seconds

    def stop(self):
        self.is_active = False
