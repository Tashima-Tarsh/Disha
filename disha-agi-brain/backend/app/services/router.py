import structlog
from enum import Enum

logger = structlog.get_logger("model_router")

class ModelTier(Enum):
    FAST = "fast"      # e.g., GPT-4o-mini, Haiku
    POWERFUL = "powerful" # e.g., GPT-4o, Sonnet 3.5
    LOCAL = "local"    # e.g., Llama 3 (Ollama)

class ModelRouter:
    """Intelligently routes AI tasks to the most cost-effective model tier."""
    
    def __init__(self):
        self.usage_stats = {"fast": 0, "powerful": 0, "local": 0}

    def route_task(self, query: str, complexity_hint: str = None) -> ModelTier:
        """Determines the best model based on query length and keyword analysis."""
        
        # High complexity keywords
        complex_keywords = ["refactor", "architect", "security audit", "optimize", "rewrite"]
        
        is_complex = any(k in query.lower() for k in complex_keywords) or (complexity_hint == "high")
        
        if is_complex or len(query) > 1000:
            tier = ModelTier.POWERFUL
        elif "local" in query.lower():
            tier = ModelTier.LOCAL
        else:
            tier = ModelTier.FAST
            
        self.usage_stats[tier.value] += 1
        logger.info("task_routed", tier=tier.value, query_len=len(query))
        return tier
