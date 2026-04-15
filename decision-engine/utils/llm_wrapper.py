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

import hashlib
import os
from typing import Optional

_PROVIDER = os.getenv("DISHA_MODEL_PROVIDER", "mock").lower()
_MODEL_PATH = os.getenv("DISHA_MODEL_PATH", "")
_SEED = int(os.getenv("DISHA_MODEL_SEED", "42"))


# ── llama-cpp-python availability ─────────────────────────────────────
try:
    from llama_cpp import Llama as _Llama  # type: ignore[import-untyped]

    _LLAMA_AVAILABLE = True
except ImportError:
    _LLAMA_AVAILABLE = False


def llama_available() -> bool:
    """Return *True* when ``llama-cpp-python`` is importable."""
    return _LLAMA_AVAILABLE


# ── Mock LLM ──────────────────────────────────────────────────────────
class MockLLM:
    """Deterministic mock that returns a hash-based response."""

    def __init__(self, seed: int = _SEED) -> None:
        self.seed = seed

    def generate(self, prompt: str, max_tokens: int = 256) -> str:
        digest = hashlib.sha256(
            f"{self.seed}:{prompt}".encode()
        ).hexdigest()[:16]
        return (
            f"[mock-response seed={self.seed} hash={digest}] "
            "Based on the provided scenario, the analysis indicates "
            "multiple dimensions to consider.  Key factors include "
            "constitutional provisions, political dynamics, security "
            "implications, and ethical considerations."
        )


# ── LlamaCpp LLM ─────────────────────────────────────────────────────
class LlamaCppLLM:
    """Wrapper around ``llama-cpp-python``'s ``Llama`` with deterministic seeding."""

    def __init__(
        self,
        model_path: str,
        seed: int = _SEED,
        n_ctx: int = 2048,
        n_threads: Optional[int] = None,
    ) -> None:
        if not _LLAMA_AVAILABLE:
            raise RuntimeError(
                "llama-cpp-python is not installed. "
                "Install with: pip install llama-cpp-python"
            )
        kwargs: dict = {
            "model_path": model_path,
            "seed": seed,
            "n_ctx": n_ctx,
            "verbose": False,
        }
        if n_threads is not None:
            kwargs["n_threads"] = n_threads
        self._llm = _Llama(**kwargs)
        self.seed = seed

    def generate(self, prompt: str, max_tokens: int = 256) -> str:
        output = self._llm(
            prompt,
            max_tokens=max_tokens,
            temperature=0.0,
            top_p=1.0,
        )
        return output["choices"][0]["text"].strip()


# ── Factory ───────────────────────────────────────────────────────────
def get_llm(
    provider: Optional[str] = None,
    model_path: Optional[str] = None,
    seed: Optional[int] = None,
) -> MockLLM | LlamaCppLLM:
    """Return an LLM instance based on configuration.

    Preference order for *provider*: explicit arg → ``DISHA_MODEL_PROVIDER``
    env-var → ``"mock"``.
    """
    prov = (provider or _PROVIDER).lower()
    path = model_path or _MODEL_PATH
    s = seed if seed is not None else _SEED

    if prov == "llama_cpp":
        return LlamaCppLLM(model_path=path, seed=s)

    if prov == "auto":
        if _LLAMA_AVAILABLE and path and os.path.isfile(path):
            return LlamaCppLLM(model_path=path, seed=s)
        return MockLLM(seed=s)

    # default → mock
    return MockLLM(seed=s)
