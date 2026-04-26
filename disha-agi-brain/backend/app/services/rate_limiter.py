import time
import structlog
from typing import Dict, Tuple

logger = structlog.get_logger("rate_limiter")

class RateLimiter:
    """Token Bucket rate limiter for API and Agent execution protection."""
    
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list] = {}  # {client_id: [timestamps]}

    def is_allowed(self, client_id: str) -> bool:
        """Checks if a request is allowed based on the sliding window."""
        now = time.time()
        window_start = now - 60
        
        # Initialize or clean up history
        if client_id not in self.requests:
            self.requests[client_id] = []
        
        # Filter timestamps outside the window
        self.requests[client_id] = [t for t in self.requests[client_id] if t > window_start]
        
        if len(self.requests[client_id]) < self.requests_per_minute:
            self.requests[client_id].append(now)
            return True
        
        logger.warning("rate_limit_exceeded", client=client_id, limit=self.requests_per_minute)
        return False
