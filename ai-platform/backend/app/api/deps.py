from functools import lru_cache

from app.services.alerts.alert_manager import AlertManager, ConnectionManager
from app.agents.orchestrator import Orchestrator
from app.services.memory.vector_store import VectorStore
from app.services.graph.knowledge_graph import KnowledgeGraph

from app.multimodal.vision_agent import VisionAgent
from app.multimodal.audio_agent import AudioAgent
from app.multimodal.fusion import MultimodalFusion

from app.collaboration.coordinator import ClusterCoordinator

from app.rl.reward import RewardComputer
from app.rl.policy import PolicyNetwork
from app.rl.environment import InvestigationEnvironment

from app.prompts.optimizer import PromptOptimizer
from app.ranking.intelligence_ranker import IntelligenceRanker

@lru_cache()
def get_connection_manager() -> ConnectionManager:
    return ConnectionManager()

@lru_cache()
def get_alert_manager() -> AlertManager:
    # Depends on connection_manager
    return AlertManager(get_connection_manager())

@lru_cache()
def get_orchestrator() -> Orchestrator:
    return Orchestrator()

@lru_cache()
def get_vector_store() -> VectorStore:
    return VectorStore()

@lru_cache()
def get_knowledge_graph() -> KnowledgeGraph:
    return KnowledgeGraph()

@lru_cache()
def get_vision_agent() -> VisionAgent:
    return VisionAgent()

@lru_cache()
def get_audio_agent() -> AudioAgent:
    return AudioAgent()

@lru_cache()
def get_multimodal_fusion() -> MultimodalFusion:
    return MultimodalFusion()

@lru_cache()
def get_cluster_coordinator() -> ClusterCoordinator:
    return ClusterCoordinator()

@lru_cache()
def get_reward_computer() -> RewardComputer:
    return RewardComputer()

@lru_cache()
def get_policy_network() -> PolicyNetwork:
    return PolicyNetwork()

@lru_cache()
def get_rl_environment() -> InvestigationEnvironment:
    return InvestigationEnvironment()

@lru_cache()
def get_prompt_optimizer() -> PromptOptimizer:
    return PromptOptimizer()

@lru_cache()
def get_intelligence_ranker() -> IntelligenceRanker:
    return IntelligenceRanker()
