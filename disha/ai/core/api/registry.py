from __future__ import annotations

import abc
import hashlib
import os
import sys
from typing import Any


class BaseLLMProvider(abc.ABC):
    @abc.abstractmethod
    def __init__(self, **kwargs: Any) -> None:
        pass

    @abc.abstractmethod
    def generate(self, prompt: str, max_tokens: int = 256) -> str:
        pass


class MockProvider(BaseLLMProvider):
    def __init__(self, seed: int = 42, **kwargs: Any) -> None:
        self.seed = seed

    def generate(self, prompt: str, max_tokens: int = 256) -> str:
        digest = hashlib.sha256(f"{self.seed}:{prompt}".encode()).hexdigest()[:16]
        return (
            f"[mock-response seed={self.seed} hash={digest}] "
            "Analysis complete. The system has identified key strategic vectors. "
            "Cognitive defense status: Optimal."
        )


class LlamaCppProvider(BaseLLMProvider):
    def __init__(
        self, model_path: str | None = None, seed: int = 42, **kwargs: Any
    ) -> None:
        try:
            from llama_cpp import Llama

            path = model_path or os.getenv("DISHA_MODEL_PATH", "")
            if not path or not os.path.exists(path):
                raise FileNotFoundError(f"Model path not found: {path}")
            self._llm = Llama(model_path=path, seed=seed, verbose=False, **kwargs)
        except ImportError:
            print(
                "Error: llama-cpp-python not installed. Fallback to mock.",
                file=sys.stderr,
            )
            self._llm = None

    def generate(self, prompt: str, max_tokens: int = 256) -> str:
        if self._llm is None:
            return MockProvider().generate(prompt, max_tokens)

        output = self._llm(
            prompt,
            max_tokens=max_tokens,
            temperature=0.0,
            top_p=1.0,
        )
        return str(output["choices"][0]["text"]).strip()


class AnthropicProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: str | None = None,
        model: str = "claude-3-5-sonnet-20241022",
        **kwargs: Any,
    ) -> None:
        try:
            from anthropic import Anthropic

            key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
            if not key:
                print(
                    "Warning: ANTHROPIC_API_KEY not found. Native generate may fail.",
                    file=sys.stderr,
                )
            self._client = Anthropic(api_key=key)
            self.model = model
        except ImportError:
            print(
                "Error: anthropic sdk not installed. Fallback to mock.", file=sys.stderr
            )
            self._client = None

    def generate(self, prompt: str, max_tokens: int = 1024) -> str:
        if self._client is None:
            return MockProvider().generate(prompt, max_tokens)

        message = self._client.messages.create(
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
        )
        return "".join([b.text for b in message.content if hasattr(b, "text")])


class ModelRegistry:
    _providers: dict[str, type[BaseLLMProvider]] = {}

    @classmethod
    def register(cls, name: str, provider_class: type[BaseLLMProvider]) -> None:
        cls._providers[name.lower()] = provider_class

    @classmethod
    def get_provider(cls, name: str | None = None, **kwargs: Any) -> BaseLLMProvider:
        raw_name = name or os.getenv("DISHA_MODEL_PROVIDER", "mock") or "mock"
        provider_name = raw_name.lower()

        if provider_name not in cls._providers:
            return cls._providers["mock"](**kwargs)

        return cls._providers[provider_name](**kwargs)

    @classmethod
    def get_provider_class(cls, name: str) -> type[BaseLLMProvider]:
        provider_name = name.lower()
        return cls._providers.get(provider_name, cls._providers["mock"])


ModelRegistry.register("mock", MockProvider)
ModelRegistry.register("llama_cpp", LlamaCppProvider)
ModelRegistry.register("llama-cpp", LlamaCppProvider)
ModelRegistry.register("anthropic", AnthropicProvider)
ModelRegistry.register("claude", AnthropicProvider)
