from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .contracts import ChatProvider


@dataclass(slots=True)
class ProviderConfig:
    provider: ChatProvider
    base_url: str
    api_key: str = ""
    local_mode: bool = False

    def normalized_base_url(self) -> str:
        return self.base_url.rstrip("/")

    def requires_api_key(self) -> bool:
        return self.provider in {
            ChatProvider.ANTHROPIC,
            ChatProvider.GITHUB_MODELS,
            ChatProvider.OPENAI,
        }


@dataclass(slots=True)
class ProviderProbeResult:
    ok: bool
    provider: str
    api_url: str
    local_mode: bool
    requires_api_key: bool
    probe: str
    status: int = 200
    error: str = ""


class ProviderError(RuntimeError):
    def __init__(self, message: str, status: int = 500) -> None:
        super().__init__(message)
        self.status = status


def default_base_url(provider: ChatProvider) -> str:
    defaults = {
        ChatProvider.ANTHROPIC: "https://api.anthropic.com",
        ChatProvider.GITHUB_MODELS: "https://models.github.ai/inference",
        ChatProvider.OPENAI: "https://api.openai.com",
        ChatProvider.OPENAI_COMPATIBLE: "http://127.0.0.1:8000",
        ChatProvider.OLLAMA: "http://127.0.0.1:11434",
        ChatProvider.VLLM: "http://127.0.0.1:8000",
    }
    return defaults[provider]


def extract_message_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""

    parts: list[str] = []
    for item in content:
        if not isinstance(item, dict):
            continue
        if item.get("type") == "text":
            parts.append(str(item.get("text", "")))
        elif item.get("type") == "tool_result":
            parts.append(extract_message_text(item.get("content")))
    return "".join(parts)


def _request_json(url: str, method: str = "GET", payload: dict[str, Any] | None = None, headers: dict[str, str] | None = None, timeout: float = 5.0) -> tuple[int, bytes, dict[str, str]]:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8") if payload is not None else None,
        headers=headers or {},
        method=method,
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            response_headers = {key.lower(): value for key, value in response.headers.items()}
            return response.status, response.read(), response_headers
    except HTTPError as error:
        body = error.read()
        raise ProviderError(body.decode("utf-8") or f"Provider returned HTTP {error.code}", status=error.code) from error
    except URLError as error:
        raise ProviderError(str(error.reason), status=502) from error


def _parse_sse_payload(raw: bytes) -> list[str]:
    payloads: list[str] = []
    for line in raw.decode("utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("data:"):
            payloads.append(stripped[5:].strip())
    return payloads


def _normalize_anthropic_events(raw: bytes) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for payload in _parse_sse_payload(raw):
        if payload == "[DONE]":
            break
        event = json.loads(payload)
        if event.get("type") == "content_block_delta" and event.get("delta", {}).get("text"):
            chunks.append({"type": "text", "content": event["delta"]["text"]})
        elif event.get("type") == "error":
            raise ProviderError(event.get("error", {}).get("message", "Anthropic request failed"), status=502)
    return chunks


def _normalize_openai_events(raw: bytes) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for payload in _parse_sse_payload(raw):
        if payload == "[DONE]":
            break
        event = json.loads(payload)
        if event.get("error", {}).get("message"):
            raise ProviderError(event["error"]["message"], status=502)
        choice = (event.get("choices") or [{}])[0]
        delta = choice.get("delta", {}).get("content")
        if isinstance(delta, str) and delta:
            chunks.append({"type": "text", "content": delta})
        elif isinstance(delta, list):
            combined = "".join(part.get("text", "") for part in delta if isinstance(part, dict))
            if combined:
                chunks.append({"type": "text", "content": combined})
    return chunks


def _build_openai_messages(messages: list[dict[str, Any]], system_prompt: str) -> list[dict[str, str]]:
    prepared: list[dict[str, str]] = []
    if system_prompt.strip():
        prepared.append({"role": "system", "content": system_prompt.strip()})
    for message in messages:
        role = message.get("role", "user")
        if role == "tool":
            role = "user"
        prepared.append({"role": "assistant" if role == "assistant" else "user", "content": extract_message_text(message.get("content"))})
    return prepared


def _build_anthropic_messages(messages: list[dict[str, Any]]) -> list[dict[str, str]]:
    prepared: list[dict[str, str]] = []
    for message in messages:
        role = message.get("role", "user")
        if role == "system":
            continue
        if role == "tool":
            role = "user"
        prepared.append({"role": "assistant" if role == "assistant" else "user", "content": extract_message_text(message.get("content"))})
    return prepared


def probe_provider(config: ProviderConfig, timeout: float = 5.0) -> ProviderProbeResult:
    if os.getenv("AGCLAW_BACKEND_MOCK_HEALTH") == "1":
        return ProviderProbeResult(
            ok=True,
            provider=config.provider.value,
            api_url=config.normalized_base_url(),
            local_mode=config.local_mode,
            requires_api_key=config.requires_api_key(),
            probe="mock://health",
        )

    if config.requires_api_key() and not config.api_key:
        return ProviderProbeResult(
            ok=False,
            provider=config.provider.value,
            api_url=config.normalized_base_url(),
            local_mode=config.local_mode,
            requires_api_key=config.requires_api_key(),
            probe=_probe_path(config.provider, config.normalized_base_url()),
            status=400,
            error=f"{config.provider.value} API key is required",
        )

    probe_candidates: list[tuple[str, dict[str, str]]] = []
    if config.provider == ChatProvider.ANTHROPIC:
        probe_candidates.append((f"{config.normalized_base_url()}/v1/models", {"x-api-key": config.api_key, "anthropic-version": "2023-06-01"}))
    elif config.provider == ChatProvider.GITHUB_MODELS:
        probe_candidates.append((f"{config.normalized_base_url()}/models", _github_headers(config.api_key)))
    elif config.provider == ChatProvider.OPENAI:
        probe_candidates.append((f"{config.normalized_base_url()}/v1/models", _bearer_headers(config.api_key)))
    elif config.provider == ChatProvider.OLLAMA:
        probe_candidates.extend(
            [
                (f"{config.normalized_base_url()}/api/tags", {}),
                (f"{config.normalized_base_url()}/v1/models", _bearer_headers(config.api_key)),
            ]
        )
    else:
        probe_candidates.extend(
            [
                (f"{config.normalized_base_url()}/health", _bearer_headers(config.api_key)),
                (f"{config.normalized_base_url()}/v1/models", _bearer_headers(config.api_key)),
            ]
        )

    last_error = "Connection failed"
    last_status = 500
    last_probe = probe_candidates[0][0]
    for probe_url, headers in probe_candidates:
        last_probe = probe_url
        try:
            status, _, _ = _request_json(probe_url, headers=headers, timeout=timeout)
            return ProviderProbeResult(
                ok=200 <= status < 300,
                provider=config.provider.value,
                api_url=config.normalized_base_url(),
                local_mode=config.local_mode,
                requires_api_key=config.requires_api_key(),
                probe=probe_url,
                status=status,
            )
        except ProviderError as error:
            last_error = str(error)
            last_status = error.status

    return ProviderProbeResult(
        ok=False,
        provider=config.provider.value,
        api_url=config.normalized_base_url(),
        local_mode=config.local_mode,
        requires_api_key=config.requires_api_key(),
        probe=last_probe,
        status=last_status,
        error=last_error,
    )


def chat_chunks(*, config: ProviderConfig, model: str, messages: list[dict[str, Any]], system_prompt: str = "", temperature: float = 1.0, max_tokens: int = 8096, stream: bool = True, timeout: float = 30.0) -> list[dict[str, Any]]:
    if os.getenv("AGCLAW_BACKEND_MOCK_CHAT") == "1":
        prompt = extract_message_text(messages[-1].get("content")) if messages else "ready"
        return [{"type": "text", "content": f"AG-Claw research reply via {config.provider.value} on {model}: {prompt or 'ready'}"}]

    if config.provider == ChatProvider.ANTHROPIC:
        return _anthropic_chat_chunks(
            config=config,
            model=model,
            messages=messages,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=stream,
            timeout=timeout,
        )
    return _openai_chat_chunks(
        config=config,
        model=model,
        messages=messages,
        system_prompt=system_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=stream,
        timeout=timeout,
    )


def _anthropic_chat_chunks(*, config: ProviderConfig, model: str, messages: list[dict[str, Any]], system_prompt: str, temperature: float, max_tokens: int, stream: bool, timeout: float) -> list[dict[str, Any]]:
    if not config.api_key:
        raise ProviderError("Anthropic API key is required", status=400)

    payload = {
        "model": model,
        "system": system_prompt.strip() or None,
        "messages": _build_anthropic_messages(messages),
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": stream,
    }
    headers = {
        "Content-Type": "application/json",
        "x-api-key": config.api_key,
        "anthropic-version": "2023-06-01",
    }
    status, body, _ = _request_json(f"{config.normalized_base_url()}/v1/messages", method="POST", payload=payload, headers=headers, timeout=timeout)
    if not stream:
        data = json.loads(body.decode("utf-8"))
        content_parts = data.get("content") or []
        combined = "".join(part.get("text", "") for part in content_parts if isinstance(part, dict) and part.get("type") == "text")
        return [{"type": "text", "content": combined}]
    return _normalize_anthropic_events(body)


def _openai_chat_chunks(*, config: ProviderConfig, model: str, messages: list[dict[str, Any]], system_prompt: str, temperature: float, max_tokens: int, stream: bool, timeout: float) -> list[dict[str, Any]]:
    payload = {
        "model": model,
        "messages": _build_openai_messages(messages, system_prompt),
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": stream,
    }
    headers = {"Content-Type": "application/json", **_provider_chat_headers(config)}
    status, body, _ = _request_json(_chat_completions_url(config), method="POST", payload=payload, headers=headers, timeout=timeout)
    if not stream:
        data = json.loads(body.decode("utf-8"))
        choice = (data.get("choices") or [{}])[0]
        message = choice.get("message", {})
        content = message.get("content", "")
        if isinstance(content, list):
            content = "".join(part.get("text", "") for part in content if isinstance(part, dict))
        return [{"type": "text", "content": content}]
    return _normalize_openai_events(body)


def _bearer_headers(api_key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {api_key}"} if api_key else {}


def _github_headers(api_key: str) -> dict[str, str]:
    headers = _bearer_headers(api_key)
    headers["X-GitHub-Api-Version"] = "2022-11-28"
    return headers


def _provider_chat_headers(config: ProviderConfig) -> dict[str, str]:
    if config.provider == ChatProvider.GITHUB_MODELS:
        return _github_headers(config.api_key)
    return _bearer_headers(config.api_key)


def _chat_completions_url(config: ProviderConfig) -> str:
    base_url = config.normalized_base_url()
    if config.provider == ChatProvider.GITHUB_MODELS:
        return f"{base_url}/chat/completions"
    return f"{base_url}/v1/chat/completions"


def _probe_path(provider: ChatProvider, base_url: str) -> str:
    if provider == ChatProvider.GITHUB_MODELS:
        return f"{base_url}/models"
    return f"{base_url}/v1/models"
