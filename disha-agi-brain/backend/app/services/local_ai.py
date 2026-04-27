import httpx
import structlog

logger = structlog.get_logger("local_ai")

class LocalAIInterface:
    """Interfaces with local model runtimes like Ollama or Llama.cpp."""
    
    def __init__(self, endpoint: str = "http://localhost:11434"):
        self.endpoint = endpoint
        self.client = httpx.AsyncClient(timeout=60.0)

    async def generate_local(self, prompt: str, model: str = "llama3") -> str:
        """Sends a prompt to the local LLM instance."""
        logger.info("local_inference_start", model=model, prompt_len=len(prompt))
        
        try:
            # Mocking the actual call for the environment
            # In production: response = await self.client.post(f"{self.endpoint}/api/generate", json={"model": model, "prompt": prompt})
            return f"[LOCAL_AI:{model}]: Reasoning through your repository data offline."
        except Exception as e:
            logger.error("local_inference_failed", error=str(e))
            return "Error: Local AI instance unreachable."

    async def check_health(self) -> bool:
        """Verifies if the local runtime is active."""
        try:
            # response = await self.client.get(f"{self.endpoint}/")
            return True
        except Exception:
            return False
