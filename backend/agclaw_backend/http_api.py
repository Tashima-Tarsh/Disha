from __future__ import annotations

import json
import os
from dataclasses import asdict
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse

from .contracts import ChatProvider, LogSlimRequest, MesRetrieveRequest, OrchestratorRole, ResearchContext, ResearchRequest, ScreenInterpretRequest
from .history_store import append_orchestration_history, get_orchestration_detail, list_orchestration_history
from .mes_services import interpret_screen, list_mes_datasets, retrieve_mes_context, slim_log
from .orchestrator import run_research_orchestration
from .providers import ProviderConfig, ProviderError, chat_chunks, default_base_url, probe_provider


def _json_bytes(payload: Any) -> bytes:
    return json.dumps(payload).encode("utf-8")


def _sse_bytes(chunks: list[dict[str, Any]]) -> bytes:
    payload = b"".join([f"data: {json.dumps(chunk)}\n\n".encode("utf-8") for chunk in chunks])
    return payload + b"data: [DONE]\n\n"


class AgClawApiHandler(BaseHTTPRequestHandler):
    server_version = "AGClawBackend/0.3"

    def log_message(self, format: str, *args: object) -> None:
        if os.getenv("AGCLAW_BACKEND_QUIET") == "1":
            return
        super().log_message(format, *args)

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def _send_json(self, payload: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = _json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_sse(self, chunks: list[dict[str, Any]], status: HTTPStatus = HTTPStatus.OK) -> None:
        body = _sse_bytes(chunks)
        self.send_response(status)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._send_json({"ok": True, "service": "agclaw-backend", "mode": "research"})
            return
        if parsed.path == "/api/provider-health":
            params = parse_qs(parsed.query)
            provider = ChatProvider(params.get("provider", [ChatProvider.ANTHROPIC.value])[0])
            config = ProviderConfig(
                provider=provider,
                base_url=params.get("apiUrl", [default_base_url(provider)])[0],
                api_key=params.get("apiKey", [""])[0],
                local_mode=provider != ChatProvider.ANTHROPIC,
            )
            result = probe_provider(config)
            self._send_json(asdict(result), HTTPStatus(result.status if result.status >= 400 else 200))
            return
        if parsed.path == "/api/orchestration/history":
            params = parse_qs(parsed.query)
            limit = max(1, int(params.get("limit", ["10"])[0]))
            history = [asdict(entry) for entry in list_orchestration_history(limit=limit)]
            self._send_json({"items": history})
            return
        if parsed.path.startswith("/api/orchestration/history/"):
            detail_id = parsed.path.rsplit("/", 1)[-1]
            detail = get_orchestration_detail(detail_id)
            if detail is None:
                self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
                return
            self._send_json(asdict(detail))
            return
        if parsed.path == "/api/mes/datasets":
            self._send_json({"items": [asdict(dataset) for dataset in list_mes_datasets()]})
            return
        self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/api/chat":
            body = self._read_json()
            model = body.get("model") or "unknown-model"
            settings = body.get("settings") or {}
            provider = ChatProvider(settings.get("provider", ChatProvider.ANTHROPIC.value))
            config = ProviderConfig(
                provider=provider,
                base_url=settings.get("apiUrl") or default_base_url(provider),
                api_key=settings.get("apiKey", ""),
                local_mode=provider != ChatProvider.ANTHROPIC,
            )
            try:
                chunks = chat_chunks(
                    config=config,
                    model=model,
                    messages=body.get("messages") or [],
                    system_prompt=settings.get("systemPrompt", ""),
                    temperature=float(settings.get("temperature", 1)),
                    max_tokens=int(settings.get("maxTokens", 8096)),
                    stream=bool(body.get("stream", True)),
                )
            except ProviderError as error:
                self._send_json({"error": str(error)}, HTTPStatus(error.status))
                return
            self._send_sse(chunks)
            return

        if self.path == "/api/orchestrate":
            body = self._read_json()
            request = ResearchRequest(
                prompt=body.get("prompt", ""),
                provider=ChatProvider(body.get("provider", ChatProvider.OLLAMA.value)),
                model=body.get("model", "qwen2.5-coder:7b"),
                roles=[OrchestratorRole(role) for role in body.get("roles", [OrchestratorRole.PLC_ANALYST.value])],
                context=ResearchContext(
                    workspace_root=(body.get("context") or {}).get("workspace_root", os.getcwd()),
                    project_name=(body.get("context") or {}).get("project_name", "ag-claw"),
                    safety_mode=(body.get("context") or {}).get("safety_mode", "advisory-only"),
                    metadata=(body.get("context") or {}).get("metadata", {}),
                ),
                attachments=body.get("attachments", []),
            )
            response = run_research_orchestration(request)
            append_orchestration_history(request, response)
            self._send_json(asdict(response))
            return

        if self.path == "/api/mes/log-slim":
            body = self._read_json()
            response = slim_log(
                LogSlimRequest(
                    text=body.get("text", ""),
                    preserve_tokens=body.get("preserve_tokens", []),
                    max_lines=int(body.get("max_lines", 25)),
                )
            )
            self._send_json(asdict(response))
            return

        if self.path == "/api/mes/retrieve":
            body = self._read_json()
            response = retrieve_mes_context(
                MesRetrieveRequest(
                    query=body.get("query", ""),
                    domains=body.get("domains", []),
                    limit=int(body.get("limit", 5)),
                    dataset_ids=body.get("dataset_ids", []),
                )
            )
            self._send_json(asdict(response))
            return

        if self.path == "/api/mes/interpret-screen":
            body = self._read_json()
            response = interpret_screen(
                ScreenInterpretRequest(
                    title=body.get("title", ""),
                    notes=body.get("notes", ""),
                    visible_labels=body.get("visible_labels", []),
                    image_name=body.get("image_name", ""),
                    image_data_url=body.get("image_data_url", ""),
                )
            )
            self._send_json(asdict(response))
            return

        self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)


def create_server(host: str = "127.0.0.1", port: int = 8008) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), AgClawApiHandler)


def serve(host: str = "127.0.0.1", port: int = 8008) -> None:
    server = create_server(host, port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
