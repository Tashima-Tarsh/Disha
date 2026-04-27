import time
import structlog
from typing import List, Dict

logger = structlog.get_logger("latency_monitor")

class LatencyMonitor:
    """Tracks and reports performance bottlenecks across the AGI stack."""
    
    def __init__(self):
        self.history: List[Dict[str, float]] = []

    def record_latency(self, component: str, start_time: float):
        """Calculates and logs the duration of a component execution."""
        duration = (time.time() - start_time) * 1000 # ms
        entry = {
            "component": component,
            "latency_ms": round(duration, 2),
            "timestamp": time.time()
        }
        self.history.append(entry)
        
        # Alert if latency is too high
        if duration > 2000:
            logger.warning("latency_alert", component=component, duration=duration)
        else:
            logger.info("performance_tracked", component=component, duration=duration)

    def get_p95_latency(self, component: str) -> float:
        """Calculates the P95 latency for a specific component."""
        comp_latencies = sorted([h["latency_ms"] for h in self.history if h["component"] == component])
        if not comp_latencies:
            return 0.0
        
        idx = int(len(comp_latencies) * 0.95)
        return comp_latencies[idx]
