from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


class OpenAiFixtureHandler(BaseHTTPRequestHandler):
    server_version = "AGClawFixture/0.1"

    def log_message(self, format: str, *args: object) -> None:
        return

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def _extract_prompt(self, message_content: Any) -> str:
        if isinstance(message_content, str):
            return message_content
        if isinstance(message_content, list):
            parts: list[str] = []
            for item in message_content:
                if not isinstance(item, dict):
                    continue
                if item.get("type") == "text":
                    parts.append(str(item.get("text", "")))
            return " ".join(part for part in parts if part)
        return "ready"

    def _send_json(self, payload: Any, status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_sse(self, events: list[dict[str, Any]]) -> None:
        payload = b"".join([f"data: {json.dumps(event)}\n\n".encode("utf-8") for event in events]) + b"data: [DONE]\n\n"
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._send_json({"ok": True, "service": "openai-fixture"})
            return
        if self.path == "/models":
            self._send_json({"data": [{"id": "fixture-model"}]})
            return
        if self.path == "/v1/models":
            self._send_json({"data": [{"id": "fixture-model"}]})
            return
        if self.path == "/api/tags":
            self._send_json({"models": [{"name": "fixture-model"}]})
            return
        self._send_json({"error": "Not found"}, status=404)

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/v1/chat/completions":
            body = self._read_json()
            messages = body.get("messages") or []
            prompt = self._extract_prompt(messages[-1].get("content", "ready")) if messages else "ready"
            if body.get("stream", True):
                self._send_sse(
                    [
                        {"choices": [{"delta": {"content": f"Fixture reply: {prompt}"}, "finish_reason": None}]},
                        {"choices": [{"delta": {}, "finish_reason": "stop"}]},
                    ]
                )
            else:
                self._send_json({"choices": [{"message": {"content": f"Fixture reply: {prompt}"}}]})
            return
        if self.path == "/chat/completions":
            body = self._read_json()
            messages = body.get("messages") or []
            prompt = self._extract_prompt(messages[-1].get("content", "ready")) if messages else "ready"
            if body.get("stream", True):
                self._send_sse(
                    [
                        {"choices": [{"delta": {"content": f"Fixture reply: {prompt}"}, "finish_reason": None}]},
                        {"choices": [{"delta": {}, "finish_reason": "stop"}]},
                    ]
                )
            else:
                self._send_json({"choices": [{"message": {"content": f"Fixture reply: {prompt}"}}]})
            return
        self._send_json({"error": "Not found"}, status=404)


def create_openai_fixture_server(host: str = "127.0.0.1", port: int = 0) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), OpenAiFixtureHandler)
