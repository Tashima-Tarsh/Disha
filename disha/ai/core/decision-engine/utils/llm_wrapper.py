from __future__ import annotations

from typing import Optional

from disha.ai.core.api.registry import ModelRegistry

try:
    import llama_cpp

    _LLAMA_AVAILABLE = True
except ImportError:
    _LLAMA_AVAILABLE = False


def llama_available() -> bool:
    return _LLAMA_AVAILABLE


MockLLM = ModelRegistry.get_provider_class("mock")

LlamaCppLLM = ModelRegistry.get_provider_class("llama_cpp")


def get_llm(
    provider: Optional[str] = None,
    model_path: Optional[str] = None,
    seed: Optional[int] = None,
    **kwargs,
):
    return ModelRegistry.get_provider(
        name=provider, model_path=model_path, seed=seed, **kwargs
    )
