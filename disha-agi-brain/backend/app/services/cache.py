import json
import redis
import structlog
from typing import Any, Optional
from app.core.config import get_settings

logger = structlog.get_logger("cache_service")

class CacheService:
    """High-performance Redis caching for DISHA OS."""
    
    def __init__(self):
        settings = get_settings()
        try:
            self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
            logger.info("cache_connected", url=settings.REDIS_URL)
        except Exception as e:
            logger.warning("cache_connection_failed", error=str(e))
            self.redis = None

    def get(self, key: str) -> Optional[Any]:
        if not self.redis:
            return None
        data = self.redis.get(key)
        if data:
            logger.info("cache_hit", key=key)
            return json.loads(data)
        return None

    def set(self, key: str, value: Any, expire_seconds: int = 3600):
        if not self.redis:
            return
        self.redis.set(key, json.dumps(value), ex=expire_seconds)
        logger.info("cache_set", key=key, ttl=expire_seconds)

    def invalidate(self, key: str):
        if not self.redis:
            return
        self.redis.delete(key)
        logger.info("cache_invalidated", key=key)
