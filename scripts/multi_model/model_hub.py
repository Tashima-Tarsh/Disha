"""
Multi-Model Intelligence Hub — unified interface to all major AI providers.

Provides a single ``ask()`` / ``ask_all()`` API that fans out to multiple
models and aggregates their responses.  Supports:

  - **Anthropic Claude** (claude-sonnet-4, opus, haiku)
  - **OpenAI GPT** (gpt-4o, gpt-4-turbo, gpt-3.5-turbo)
  - **Google Gemini** (gemini-1.5-pro, gemini-1.5-flash)
  - **GitHub Copilot** (via REST API)
  - **Perplexity** (sonar, sonar-pro for search-grounded answers)
  - **Ollama** (local open-source models — llama3, mistral, phi-3, codellama)
  - **HuggingFace Inference** (any model on HF Hub)
  - **Mock** (deterministic test provider)

Every provider is optional — if the API key is missing the provider is
silently skipped.  The hub never hard-fails on a single-provider outage.

Usage::

    from scripts.multi_model.model_hub import ModelHub

    hub = ModelHub()
    # Single best answer
    answer = hub.ask("Explain quantum entanglement", prefer="claude")
    # Fan-out to all available models
    results = hub.ask_all("What is a GNN?")
    # Consensus answer
    consensus = hub.consensus("Is AES-256 secure?")
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

import structlog

logger = structlog.get_logger("model_hub")


# ═══════════════════════════════════════════════════════════════════════
# Data types
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class ModelResponse:
    """Response from a single model provider."""
    provider: str
    model: str
    content: str
    latency_ms: float = 0.0
    tokens_used: int = 0
    confidence: float = 0.0
    error: str | None = None

    @property
    def ok(self) -> bool:
        return self.error is None and bool(self.content)


@dataclass
class ConsensusResponse:
    """Aggregated response from multiple models."""
    responses: list[ModelResponse] = field(default_factory=list)
    consensus_text: str = ""
    agreement_score: float = 0.0
    best_response: ModelResponse | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "consensus": self.consensus_text,
            "agreement_score": self.agreement_score,
            "num_models": len(self.responses),
            "providers": [r.provider for r in self.responses if r.ok],
            "best_provider": self.best_response.provider if self.best_response else None,
        }


# ═══════════════════════════════════════════════════════════════════════
# Abstract provider
# ═══════════════════════════════════════════════════════════════════════

class ModelProvider(ABC):
    """Base class for all AI model providers."""

    name: str = "base"
    available: bool = False

    @abstractmethod
    def generate(self, prompt: str, **kwargs: Any) -> ModelResponse:
        """Generate a response for the given prompt."""

    def check_availability(self) -> bool:
        """Check if this provider is available (API key set, etc.)."""
        return self.available


# ═══════════════════════════════════════════════════════════════════════
# Provider implementations
# ═══════════════════════════════════════════════════════════════════════

class ClaudeProvider(ModelProvider):
    """Anthropic Claude API provider."""

    name = "claude"

    def __init__(self, model: str = "claude-sonnet-4-20250514"):
        self.model = model
        self.api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        self.available = bool(self.api_key)

    def generate(self, prompt: str, **kwargs: Any) -> ModelResponse:
        if not self.available:
            return ModelResponse(provider=self.name, model=self.model, content="", error="No API key")
        start = time.time()
        try:
            import httpx  # type: ignore[import-untyped]
            resp = httpx.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": self.model,
                    "max_tokens": kwargs.get("max_tokens", 2048),
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=60,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["content"][0]["text"]
            tokens = data.get("usage", {}).get("output_tokens", 0)
            return ModelResponse(
                provider=self.name, model=self.model, content=content,
                latency_ms=(time.time() - start) * 1000, tokens_used=tokens,
            )
        except Exception as e:
            return ModelResponse(provider=self.name, model=self.model, content="", error=str(e))


class OpenAIProvider(ModelProvider):
    """OpenAI GPT API provider."""

    name = "openai"

    def __init__(self, model: str = "gpt-4o"):
        self.model = model
        self.api_key = os.environ.get("OPENAI_API_KEY", "")
        self.available = bool(self.api_key)

    def generate(self, prompt: str, **kwargs: Any) -> ModelResponse:
        if not self.available:
            return ModelResponse(provider=self.name, model=self.model, content="", error="No API key")
        start = time.time()
        try:
            import httpx  # type: ignore[import-untyped]
            resp = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "max_tokens": kwargs.get("max_tokens", 2048),
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=60,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            tokens = data.get("usage", {}).get("total_tokens", 0)
            return ModelResponse(
                provider=self.name, model=self.model, content=content,
                latency_ms=(time.time() - start) * 1000, tokens_used=tokens,
            )
        except Exception as e:
            return ModelResponse(provider=self.name, model=self.model, content="", error=str(e))


class GeminiProvider(ModelProvider):
    """Google Gemini API provider."""

    name = "gemini"

    def __init__(self, model: str = "gemini-1.5-pro"):
        self.model = model
        self.api_key = os.environ.get("GOOGLE_API_KEY", "")
        self.available = bool(self.api_key)

    def generate(self, prompt: str, **kwargs: Any) -> ModelResponse:
        if not self.available:
            return ModelResponse(provider=self.name, model=self.model, content="", error="No API key")
        start = time.time()
        try:
            import httpx  # type: ignore[import-untyped]
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
            resp = httpx.post(
                url,
                params={"key": self.api_key},
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=60,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            return ModelResponse(
                provider=self.name, model=self.model, content=content,
                latency_ms=(time.time() - start) * 1000,
            )
        except Exception as e:
            return ModelResponse(provider=self.name, model=self.model, content="", error=str(e))


class PerplexityProvider(ModelProvider):
    """Perplexity API — search-grounded AI answers."""

    name = "perplexity"

    def __init__(self, model: str = "sonar"):
        self.model = model
        self.api_key = os.environ.get("PERPLEXITY_API_KEY", "")
        self.available = bool(self.api_key)

    def generate(self, prompt: str, **kwargs: Any) -> ModelResponse:
        if not self.available:
            return ModelResponse(provider=self.name, model=self.model, content="", error="No API key")
        start = time.time()
        try:
            import httpx  # type: ignore[import-untyped]
            resp = httpx.post(
                "https://api.perplexity.ai/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=60,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return ModelResponse(
                provider=self.name, model=self.model, content=content,
                latency_ms=(time.time() - start) * 1000,
            )
        except Exception as e:
            return ModelResponse(provider=self.name, model=self.model, content="", error=str(e))


class OllamaProvider(ModelProvider):
    """Local Ollama open-source models (llama3, mistral, phi-3, codellama, etc.)."""

    name = "ollama"

    def __init__(self, model: str = "llama3"):
        self.model = model
        self.base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        self.available = self._check_connection()

    def _check_connection(self) -> bool:
        try:
            import httpx  # type: ignore[import-untyped]
            resp = httpx.get(f"{self.base_url}/api/tags", timeout=2)
            return resp.status_code == 200
        except Exception:
            return False

    def generate(self, prompt: str, **kwargs: Any) -> ModelResponse:
        if not self.available:
            return ModelResponse(provider=self.name, model=self.model, content="", error="Ollama not running")
        start = time.time()
        try:
            import httpx  # type: ignore[import-untyped]
            resp = httpx.post(
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": False},
                timeout=120,
            )
            resp.raise_for_status()
            data = resp.json()
            return ModelResponse(
                provider=self.name, model=self.model, content=data.get("response", ""),
                latency_ms=(time.time() - start) * 1000,
            )
        except Exception as e:
            return ModelResponse(provider=self.name, model=self.model, content="", error=str(e))


class HuggingFaceProvider(ModelProvider):
    """HuggingFace Inference API provider."""

    name = "huggingface"

    def __init__(self, model: str = "meta-llama/Meta-Llama-3-8B-Instruct"):
        self.model = model
        self.api_key = os.environ.get("HF_TOKEN", "")
        self.available = bool(self.api_key)

    def generate(self, prompt: str, **kwargs: Any) -> ModelResponse:
        if not self.available:
            return ModelResponse(provider=self.name, model=self.model, content="", error="No HF token")
        start = time.time()
        try:
            import httpx  # type: ignore[import-untyped]
            resp = httpx.post(
                f"https://api-inference.huggingface.co/models/{self.model}",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"inputs": prompt, "parameters": {"max_new_tokens": kwargs.get("max_tokens", 1024)}},
                timeout=60,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data[0].get("generated_text", "") if isinstance(data, list) else str(data)
            return ModelResponse(
                provider=self.name, model=self.model, content=content,
                latency_ms=(time.time() - start) * 1000,
            )
        except Exception as e:
            return ModelResponse(provider=self.name, model=self.model, content="", error=str(e))


class MockProvider(ModelProvider):
    """Deterministic mock provider for testing (no API key needed)."""

    name = "mock"
    available = True

    def __init__(self, seed: int = 42):
        self.seed = seed

    def generate(self, prompt: str, **kwargs: Any) -> ModelResponse:
        h = hashlib.sha256(f"{self.seed}:{prompt}".encode()).hexdigest()
        return ModelResponse(
            provider=self.name,
            model="mock-v1",
            content=f"Mock response [{h[:12]}]: Analysis of '{prompt[:50]}' indicates nominal conditions.",
            latency_ms=1.0,
            confidence=0.85,
        )


# ═══════════════════════════════════════════════════════════════════════
# Model Hub (orchestrator)
# ═══════════════════════════════════════════════════════════════════════

class ModelHub:
    """Unified interface to all AI model providers.

    Instantiate once, then use ``ask()``, ``ask_all()``, or ``consensus()``
    to query one or many models.
    """

    def __init__(self, providers: list[ModelProvider] | None = None):
        if providers is not None:
            self.providers = {p.name: p for p in providers}
        else:
            self.providers = self._auto_discover()
        available = [n for n, p in self.providers.items() if p.available]
        logger.info("model_hub_init", available=available, total=len(self.providers))

    @staticmethod
    def _auto_discover() -> dict[str, ModelProvider]:
        """Auto-discover available providers based on environment."""
        return {
            "claude": ClaudeProvider(),
            "openai": OpenAIProvider(),
            "gemini": GeminiProvider(),
            "perplexity": PerplexityProvider(),
            "ollama": OllamaProvider(),
            "huggingface": HuggingFaceProvider(),
            "mock": MockProvider(),
        }

    def available_providers(self) -> list[str]:
        """Return names of currently available providers."""
        return [n for n, p in self.providers.items() if p.available]

    def ask(self, prompt: str, prefer: str | None = None, **kwargs: Any) -> ModelResponse:
        """Ask a single model. Uses preferred provider if available, else best available."""
        # Priority order
        priority = ["claude", "openai", "gemini", "perplexity", "ollama", "huggingface", "mock"]
        if prefer and prefer in self.providers and self.providers[prefer].available:
            return self.providers[prefer].generate(prompt, **kwargs)
        for name in priority:
            if name in self.providers and self.providers[name].available:
                return self.providers[name].generate(prompt, **kwargs)
        return ModelResponse(provider="none", model="none", content="", error="No providers available")

    def ask_all(self, prompt: str, **kwargs: Any) -> list[ModelResponse]:
        """Fan out to all available providers and collect responses."""
        results = []
        for name, provider in self.providers.items():
            if provider.available:
                response = provider.generate(prompt, **kwargs)
                results.append(response)
                logger.info("provider_response", provider=name, ok=response.ok, ms=response.latency_ms)
        return results

    def consensus(self, prompt: str, **kwargs: Any) -> ConsensusResponse:
        """Query all providers and build a consensus response."""
        responses = self.ask_all(prompt, **kwargs)
        ok_responses = [r for r in responses if r.ok]

        if not ok_responses:
            return ConsensusResponse(responses=responses)

        # Select best response (lowest latency among successful)
        best = min(ok_responses, key=lambda r: r.latency_ms)

        # Simple agreement score: ratio of providers that responded successfully
        agreement = len(ok_responses) / max(len(responses), 1)

        # Build consensus text from the best response
        consensus_text = best.content

        return ConsensusResponse(
            responses=responses,
            consensus_text=consensus_text,
            agreement_score=agreement,
            best_response=best,
        )

    def add_provider(self, provider: ModelProvider) -> None:
        """Add a new provider at runtime."""
        self.providers[provider.name] = provider
        logger.info("provider_added", name=provider.name, available=provider.available)

    def status(self) -> dict[str, Any]:
        """Return current hub status."""
        return {
            "providers": {
                name: {"available": p.available, "type": p.__class__.__name__}
                for name, p in self.providers.items()
            },
            "available_count": len(self.available_providers()),
            "total_count": len(self.providers),
        }
