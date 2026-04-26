import structlog
from typing import List, TypedDict, Annotated, Sequence
from datetime import datetime

from disha.ai.core.agents.specialists.hub import SpecialistHub
from app.services.security import SecurityService, UserRole, Permission

logger = structlog.get_logger("graph_reasoner")

class AgentState(TypedDict):
    """The persistent state of the intelligence turn."""
    input: str
    context: List[str]
    history: List[Dict[str, str]]
    next_step: str
    confidence: float
    final_output: str

class GraphReasoner:
    """Advanced Reasoning Engine using a directed graph for multi-agent collaboration."""
    
    def __init__(self):
        self.hub = SpecialistHub()
        self.security = SecurityService()
        self.state: AgentState = {
            "input": "",
            "context": [],
            "history": [],
            "next_step": "start",
            "confidence": 1.0,
            "final_output": ""
        }

    async def execute(self, user_input: str, user_role: UserRole = UserRole.VIEWER):
        """Executes a multi-step reasoning graph with security oversight."""
        logger.info("reasoning_graph_start", user_input=user_input, role=user_role.value)
        
        # 1. Security Gate Node
        if not self.security.authorize(user_role, Permission.EXECUTE_AGENTS):
            self.security.log_event("user_unknown", "EXECUTE_AGENTS", "GraphReasoner", "DENIED")
            return "Error: Unauthorized. High-level agent execution requires ENGINEER or higher role."
        
        self.security.log_event("user_unknown", "EXECUTE_AGENTS", "GraphReasoner", "AUTHORIZED")

        # 2. Perception Node
        self.state["input"] = user_input
        
        # 2. Collaborative Deliberation Node
        # We run the task through the Architect (check structure), Engineer (solve), and Security (audit)
        logger.info("initiating_collaborative_deliberation", workflow=["architect", "engineer", "security"])
        agent_results = await self.hub.collaborate(user_input, ["architect", "engineer", "security"])
        
        self.state["history"].append({"step": "deliberation", "results": str(agent_results)})
        
        # 3. Final Synthesis
        self.state["final_output"] = f"DishaOS Multi-Agent Response:\n"
        for agent, res in agent_results.items():
            self.state["final_output"] += f"- [{agent.upper()}]: {res}\n"
        
        logger.info("reasoning_graph_complete", confidence=self.state["confidence"])
        return self.state["final_output"]

if __name__ == "__main__":
    import asyncio
    reasoner = GraphReasoner()
    result = asyncio.run(reasoner.execute("Explain the system architecture."))
    print(result)
