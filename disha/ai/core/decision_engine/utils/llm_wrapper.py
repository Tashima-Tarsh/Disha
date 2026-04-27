from __future__ import annotations

from disha.ai.core.api.registry import ModelRegistry

try:
    import llama_cpp  # noqa: F401

    _LLAMA_AVAILABLE = True
except ImportError:
    _LLAMA_AVAILABLE = False


def llama_available() -> bool:
    return _LLAMA_AVAILABLE


MockLLM = ModelRegistry.get_provider_class("mock")

LlamaCppLLM = ModelRegistry.get_provider_class("llama_cpp")


def get_llm(
    provider: str | None = None,
    model_path: str | None = None,
    seed: int | None = None,
    **kwargs,
):
    return ModelRegistry.get_provider(
        name=provider, model_path=model_path, seed=seed, **kwargs
    )
