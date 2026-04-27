import structlog
from typing import List, Dict, Any, Optional
from app.services.cache import CacheService

logger = structlog.get_logger("memory_service")

class MemoryService:
    """Manages session-aware short-term memory and vectorized long-term context."""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.cache = CacheService()
        self.history_key = f"session_history:{session_id}"
        self.max_history = 20

    def add_turn(self, role: str, content: str):
        """Adds a turn to the session history in Redis."""
        history = self.get_history()
        history.append({"role": role, "content": content})
        
        # Trim history
        if len(history) > self.max_history:
            history = history[-self.max_history:]
            
        self.cache.set(self.history_key, history, expire_seconds=86400) # 24h retention
        logger.info("memory_turn_added", session_id=self.session_id, history_len=len(history))

    def get_history(self) -> List[Dict[str, str]]:
        """Retrieves the full session history."""
        history = self.cache.get(self.history_key)
        return history if history else []

    def clear_session(self):
        """Wipes the current session memory."""
        self.cache.invalidate(self.history_key)
        logger.info("memory_session_cleared", session_id=self.session_id)

    def get_formatted_context(self) -> str:
        """Returns the history as a formatted string for prompt injection."""
        history = self.get_history()
        formatted = ""
        for turn in history:
            formatted += f"{turn['role'].upper()}: {turn['content']}\n"
        return formatted
