"""Unified LLM wrapper with llama-cpp-python integration and mock fallback.

Environment variables
---------------------
``DISHA_MODEL_PROVIDER``
    * ``"mock"`` — deterministic stub (default for tests / CI).
    * ``"llama_cpp"`` — use a local GGUF model via *llama-cpp-python*.
    * ``"auto"`` — try llama-cpp first, then fall back to mock.

``DISHA_MODEL_PATH``
    File-system path to a ``.gguf`` model (required for ``llama_cpp``).

``DISHA_MODEL_SEED``
    Integer seed for deterministic generation (default ``42``).
"""

from __future__ import annotations

from typing import Optional

# Use the centralized registry
from disha.ai.core.api.registry import ModelRegistry


# ── llama-cpp-python availability ─────────────────────────────────────
try:
    import llama_cpp  # noqa: F401
    _LLAMA_AVAILABLE = True
except ImportError:
    _LLAMA_AVAILABLE = False


def llama_available() -> bool:
    """Return *True* when ``llama-cpp-python`` is importable."""
    return _LLAMA_AVAILABLE


# ── Mock LLM (Legacy Aliases) ──────────────────────────────────────────
MockLLM = ModelRegistry.get_provider_class("mock")


# ── LlamaCpp LLM (Legacy Aliases) ─────────────────────────────────────
LlamaCppLLM = ModelRegistry.get_provider_class("llama_cpp")


# ── Factory ───────────────────────────────────────────────────────────
def get_llm(
    provider: Optional[str] = None,
    model_path: Optional[str] = None,
    seed: Optional[int] = None,
    **kwargs
):
    """Return an LLM instance based on configuration via the central registry.
    """
    return ModelRegistry.get_provider(
        name=provider,
        model_path=model_path,
        seed=seed,
        **kwargs
    )
