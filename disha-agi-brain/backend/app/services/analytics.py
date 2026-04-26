import structlog
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = structlog.get_logger("analytics_service")

class AnalyticsService:
    """Intelligent analytics engine for DISHA OS usage and AI performance."""
    
    def __init__(self):
        self.events: List[Dict[str, Any]] = []

    def track_event(self, event_type: str, metadata: Dict[str, Any]):
        """Tracks a specific usage or AI event."""
        event = {
            "timestamp": datetime.now().isoformat(),
            "type": event_type,
            "metadata": metadata
        }
        self.events.append(event)
        logger.info("event_tracked", type=event_type, **metadata)

    def get_summary(self) -> Dict[str, Any]:
        """Generates a high-level summary of system interactions."""
        total_events = len(self.events)
        event_distribution = {}
        for ev in self.events:
            t = ev["type"]
            event_distribution[t] = event_distribution.get(t, 0) + 1
        
        return {
            "total_interactions": total_events,
            "event_distribution": event_distribution,
            "system_health_score": 100 # Placeholder for complex logic
        }

    def track_ai_interaction(self, query: str, response_time_ms: float, confidence: float):
        """Specifically tracks AI reasoning performance."""
        self.track_event("AI_INTERACTION", {
            "query_len": len(query),
            "latency": response_time_ms,
            "confidence": confidence
        })

    def track_error(self, component: str, error_msg: str, severity: str = "ERROR"):
        """Tracks system errors for 'Error Intelligence' mapping."""
        self.track_event("SYSTEM_ERROR", {
            "component": component,
            "message": error_msg,
            "severity": severity
        })
