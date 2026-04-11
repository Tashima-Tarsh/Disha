"""
LLM Wrapper — unified interface for mock, llama-cpp-python, and OpenAI providers.

Configuration via environment variables:
    DISHA_MODEL_PROVIDER: "mock" | "llamacpp" | "openai" (default: "mock")
    DISHA_MODEL_PATH: path to .gguf model file (required for llamacpp)
    OPENAI_API_KEY: OpenAI API key (required for openai)
"""
from __future__ import annotations

import hashlib
import os
from typing import Optional


class LLMWrapper:
    """Unified LLM interface supporting mock, llama-cpp-python, and OpenAI."""

    def __init__(
        self,
        provider: Optional[str] = None,
        model_path: Optional[str] = None,
    ):
        self.provider = provider or os.environ.get("DISHA_MODEL_PROVIDER", "mock")
        self.model_path = model_path or os.environ.get("DISHA_MODEL_PATH", "")
        self._llm = None

        if self.provider == "llamacpp":
            self._init_llamacpp()
        elif self.provider == "openai":
            self._init_openai()

    def _init_llamacpp(self) -> None:
        """Initialize llama-cpp-python backend."""
        if not self.model_path:
            raise ValueError(
                "DISHA_MODEL_PATH must be set when using llamacpp provider. "
                "Example: export DISHA_MODEL_PATH=/path/to/model.gguf"
            )
        try:
            from llama_cpp import Llama  # type: ignore[import-untyped]
        except ImportError:
            raise ImportError(
                "llama-cpp-python is required for the llamacpp provider. "
                "Install with: pip install 'llama-cpp-python>=0.1.71'"
            )
        self._llm = Llama(
            model_path=self.model_path,
            n_ctx=2048,
            seed=42,
            verbose=False,
        )

    def _init_openai(self) -> None:
        """Initialize OpenAI backend."""
        try:
            import openai  # type: ignore[import-untyped]
        except ImportError:
            raise ImportError(
                "openai package is required for the openai provider. "
                "Install with: pip install openai"
            )
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            raise ValueError("OPENAI_API_KEY must be set when using openai provider.")
        self._client = openai.OpenAI(api_key=api_key)

    def generate(self, prompt: str, max_tokens: int = 512) -> str:
        """Generate a response for the given prompt."""
        if self.provider == "mock":
            return self._mock_generate(prompt)
        elif self.provider == "llamacpp":
            return self._llamacpp_generate(prompt, max_tokens)
        elif self.provider == "openai":
            return self._openai_generate(prompt, max_tokens)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

    @staticmethod
    def _mock_generate(prompt: str) -> str:
        """Deterministic hash-based response for testing."""
        h = hashlib.sha256(prompt.encode()).hexdigest()[:16]
        return (
            f"[Mock LLM Response | hash={h}] "
            f"Analysis of the given scenario indicates multiple factors to consider. "
            f"Key considerations include constitutional provisions, strategic implications, "
            f"and ethical dimensions. Recommendation: balanced approach with stakeholder consultation."
        )

    def _llamacpp_generate(self, prompt: str, max_tokens: int) -> str:
        """Generate via llama-cpp-python."""
        output = self._llm(
            prompt,
            max_tokens=max_tokens,
            top_k=40,
            temperature=0.7,
            stop=["###", "\n\n\n"],
        )
        return output["choices"][0]["text"].strip()

    def _openai_generate(self, prompt: str, max_tokens: int) -> str:
        """Generate via OpenAI API."""
        response = self._client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""
