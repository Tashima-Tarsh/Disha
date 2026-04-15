"""
Disha Sentinel — Multi-Model AI Orchestrator

Routes tasks to the optimal AI model provider based on task type,
latency requirements, and availability.  Supports:

  • Claude (Anthropic) — deep reasoning, code review, security analysis
  • GPT (OpenAI)       — general intelligence, summarization
  • Gemini (Google)     — multimodal, long-context
  • Ollama (local)      — privacy-first local inference (Llama, Mistral, etc.)
  • Perplexity          — search-augmented Q&A with citations

All providers are optional — the orchestrator gracefully degrades when a
provider is unavailable or an API key is missing.

Usage::

    from scripts.sentinel.model_orchestrator import ModelOrchestrator
    orch = ModelOrchestrator()
    result = await orch.query("Analyze this IP for threats", task="security")
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("disha.sentinel.orchestrator")

# ── Provider Configurations ───────────────────────────────────────────

PROVIDER_CONFIGS: dict[str, dict[str, Any]] = {
    "claude": {
        "env_key": "ANTHROPIC_API_KEY",
        "base_url": "https://api.anthropic.com/v1",
        "default_model": "claude-sonnet-4-20250514",
        "strengths": ["reasoning", "code", "security", "analysis"],
        "max_tokens": 8192,
    },
    "openai": {
        "env_key": "OPENAI_API_KEY",
        "base_url": "https://api.openai.com/v1",
        "default_model": "gpt-4o-mini",
        "strengths": ["general", "summarization", "translation"],
        "max_tokens": 4096,
    },
    "gemini": {
        "env_key": "GEMINI_API_KEY",
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "default_model": "gemini-2.0-flash",
        "strengths": ["multimodal", "long_context", "search"],
        "max_tokens": 8192,
    },
    "ollama": {
        "env_key": "",  # No key needed for local
        "base_url": os.environ.get("OLLAMA_HOST", "http://localhost:11434"),
        "default_model": "llama3.2",
        "strengths": ["privacy", "offline", "fast_local"],
        "max_tokens": 4096,
    },
    "perplexity": {
        "env_key": "PERPLEXITY_API_KEY",
        "base_url": "https://api.perplexity.ai",
        "default_model": "sonar",
        "strengths": ["search", "citations", "realtime"],
        "max_tokens": 4096,
    },
}

# Task → preferred provider order
TASK_ROUTING: dict[str, list[str]] = {
    "security": ["claude", "openai", "ollama"],
    "code": ["claude", "openai", "ollama"],
    "analysis": ["claude", "gemini", "openai"],
    "reasoning": ["claude", "openai", "gemini"],
    "summarization": ["openai", "gemini", "claude"],
    "search": ["perplexity", "gemini", "openai"],
    "multimodal": ["gemini", "claude", "openai"],
    "translation": ["openai", "gemini", "claude"],
    "general": ["openai", "claude", "gemini", "ollama"],
    "privacy": ["ollama"],
    "offline": ["ollama"],
}


# ── Data Classes ──────────────────────────────────────────────────────

@dataclass
class ModelResponse:
    """Response from a model provider."""
    provider: str
    model: str
    content: str
    usage: dict[str, int] = field(default_factory=dict)
    latency_ms: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "model": self.model,
            "content": self.content,
            "usage": self.usage,
            "latency_ms": self.latency_ms,
            "metadata": self.metadata,
        }


@dataclass
class ConsensusResult:
    """Result from multi-model consensus."""
    primary: ModelResponse
    supporting: list[ModelResponse] = field(default_factory=list)
    consensus_score: float = 0.0
    method: str = "single"

    def to_dict(self) -> dict[str, Any]:
        return {
            "primary": self.primary.to_dict(),
            "supporting": [s.to_dict() for s in self.supporting],
            "consensus_score": self.consensus_score,
            "method": self.method,
        }


# ── Provider Implementations ─────────────────────────────────────────

async def _query_claude(prompt: str, model: str, max_tokens: int) -> ModelResponse:
    """Query Anthropic Claude API."""
    import urllib.request
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    data = json.dumps({
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=data,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
    )
    t0 = time.monotonic()
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = json.loads(resp.read())
    latency = (time.monotonic() - t0) * 1000
    content = body.get("content", [{}])[0].get("text", "")
    usage = body.get("usage", {})
    return ModelResponse(
        provider="claude", model=model, content=content,
        usage={"input_tokens": usage.get("input_tokens", 0), "output_tokens": usage.get("output_tokens", 0)},
        latency_ms=round(latency, 1),
    )


async def _query_openai(prompt: str, model: str, max_tokens: int) -> ModelResponse:
    """Query OpenAI API."""
    import urllib.request
    api_key = os.environ.get("OPENAI_API_KEY", "")
    data = json.dumps({
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
    )
    t0 = time.monotonic()
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = json.loads(resp.read())
    latency = (time.monotonic() - t0) * 1000
    content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
    usage = body.get("usage", {})
    return ModelResponse(
        provider="openai", model=model, content=content,
        usage={"input_tokens": usage.get("prompt_tokens", 0), "output_tokens": usage.get("completion_tokens", 0)},
        latency_ms=round(latency, 1),
    )


async def _query_ollama(prompt: str, model: str, _max_tokens: int) -> ModelResponse:
    """Query local Ollama instance."""
    import urllib.request
    base = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
    data = json.dumps({"model": model, "prompt": prompt, "stream": False}).encode()
    req = urllib.request.Request(
        f"{base}/api/generate", data=data,
        headers={"Content-Type": "application/json"},
    )
    t0 = time.monotonic()
    with urllib.request.urlopen(req, timeout=120) as resp:
        body = json.loads(resp.read())
    latency = (time.monotonic() - t0) * 1000
    return ModelResponse(
        provider="ollama", model=model, content=body.get("response", ""),
        usage={"total_duration_ns": body.get("total_duration", 0)},
        latency_ms=round(latency, 1),
    )


async def _query_perplexity(prompt: str, model: str, max_tokens: int) -> ModelResponse:
    """Query Perplexity API (search-augmented)."""
    import urllib.request
    api_key = os.environ.get("PERPLEXITY_API_KEY", "")
    data = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
    }).encode()
    req = urllib.request.Request(
        "https://api.perplexity.ai/chat/completions",
        data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
    )
    t0 = time.monotonic()
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = json.loads(resp.read())
    latency = (time.monotonic() - t0) * 1000
    content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
    citations = body.get("citations", [])
    return ModelResponse(
        provider="perplexity", model=model, content=content,
        latency_ms=round(latency, 1),
        metadata={"citations": citations},
    )


PROVIDER_FNS = {
    "claude": _query_claude,
    "openai": _query_openai,
    "ollama": _query_ollama,
    "perplexity": _query_perplexity,
}


# ── Orchestrator ──────────────────────────────────────────────────────

class ModelOrchestrator:
    """
    Multi-model AI orchestrator.

    Detects available providers at init, routes requests by task type,
    and falls back through alternatives when primary is unavailable.
    """

    def __init__(self) -> None:
        self.available: dict[str, dict[str, Any]] = {}
        self._detect_providers()

    def _detect_providers(self) -> None:
        """Detect which providers are available (API key present or local)."""
        for name, config in PROVIDER_CONFIGS.items():
            env_key = config["env_key"]
            if name == "ollama":
                # Always list ollama — it will fail gracefully at query time
                self.available[name] = config
            elif env_key and os.environ.get(env_key):
                self.available[name] = config
        providers = list(self.available.keys())
        logger.info("providers_detected providers=%s", providers)

    def get_provider_order(self, task: str = "general") -> list[str]:
        """Get ordered list of providers for a given task type."""
        preferred = TASK_ROUTING.get(task, TASK_ROUTING["general"])
        return [p for p in preferred if p in self.available]

    async def query(
        self,
        prompt: str,
        task: str = "general",
        provider: str | None = None,
        model: str | None = None,
        max_tokens: int | None = None,
    ) -> ModelResponse:
        """
        Query a single model provider.

        Falls back through alternatives if primary fails.
        """
        if provider and provider in self.available:
            order = [provider]
        else:
            order = self.get_provider_order(task)

        if not order:
            raise RuntimeError(
                f"No providers available for task={task!r}. "
                "Set API keys: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, PERPLEXITY_API_KEY"
            )

        last_error: Exception | None = None
        for prov_name in order:
            config = self.available[prov_name]
            query_fn = PROVIDER_FNS.get(prov_name)
            if not query_fn:
                continue

            prov_model = model or config["default_model"]
            prov_max = max_tokens or config["max_tokens"]

            try:
                result = await query_fn(prompt, prov_model, prov_max)
                logger.info(
                    "query_success provider=%s model=%s latency=%.1fms",
                    prov_name, prov_model, result.latency_ms,
                )
                return result
            except Exception as exc:
                logger.warning("query_failed provider=%s error=%s", prov_name, exc)
                last_error = exc

        raise RuntimeError(f"All providers failed for task={task!r}: {last_error}")

    async def consensus(
        self,
        prompt: str,
        task: str = "general",
        providers: list[str] | None = None,
        max_tokens: int | None = None,
    ) -> ConsensusResult:
        """
        Query multiple providers and return consensus.

        Runs providers in parallel, uses the first successful response
        as primary, rest as supporting evidence.
        """
        order = providers or self.get_provider_order(task)
        if not order:
            raise RuntimeError(f"No providers available for task={task!r}")

        tasks = []
        for prov_name in order[:3]:  # Max 3 providers for consensus
            config = self.available.get(prov_name)
            if not config:
                continue
            query_fn = PROVIDER_FNS.get(prov_name)
            if not query_fn:
                continue
            prov_model = config["default_model"]
            prov_max = max_tokens or config["max_tokens"]
            tasks.append(query_fn(prompt, prov_model, prov_max))

        if not tasks:
            raise RuntimeError(f"No query functions available for task={task!r}")

        results = await asyncio.gather(*tasks, return_exceptions=True)

        successful: list[ModelResponse] = [r for r in results if isinstance(r, ModelResponse)]
        if not successful:
            errors = [str(r) for r in results if isinstance(r, Exception)]
            raise RuntimeError(f"All consensus providers failed: {errors}")

        primary = successful[0]
        supporting = successful[1:]
        consensus_score = len(successful) / len(tasks) if tasks else 0.0

        return ConsensusResult(
            primary=primary,
            supporting=supporting,
            consensus_score=round(consensus_score, 2),
            method="parallel" if len(successful) > 1 else "single",
        )

    def status(self) -> dict[str, Any]:
        """Return current orchestrator status."""
        return {
            "available_providers": list(self.available.keys()),
            "provider_count": len(self.available),
            "task_routing": {
                task: self.get_provider_order(task)
                for task in TASK_ROUTING
            },
        }
