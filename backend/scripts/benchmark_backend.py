from __future__ import annotations

import argparse
import json
import statistics
import threading
import time
from pathlib import Path
from urllib.request import Request, urlopen

from agclaw_backend.http_api import create_server
from agclaw_backend.test_fixtures import create_openai_fixture_server


def _post_json(url: str, payload: dict[str, object]) -> None:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request) as response:
        response.read()


def _get(url: str) -> None:
    with urlopen(url) as response:
        response.read()


def _measure(label: str, iterations: int, fn) -> dict[str, object]:
    samples_ms: list[float] = []
    for _ in range(iterations):
        start = time.perf_counter()
        fn()
        samples_ms.append((time.perf_counter() - start) * 1000)
    samples_ms.sort()
    p95_index = max(0, min(len(samples_ms) - 1, int(round((len(samples_ms) - 1) * 0.95))))
    return {
        "label": label,
        "iterations": iterations,
        "avg_ms": round(statistics.mean(samples_ms), 2),
        "median_ms": round(statistics.median(samples_ms), 2),
        "p95_ms": round(samples_ms[p95_index], 2),
        "max_ms": round(max(samples_ms), 2),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark AG-Claw clean-room backend endpoints.")
    parser.add_argument("--iterations", type=int, default=10)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8018)
    parser.add_argument("--self-host", action="store_true", help="Start a temporary backend server for the benchmark run.")
    args = parser.parse_args()

    fixture = None
    fixture_thread = None
    server = None
    server_thread = None

    try:
        fixture = create_openai_fixture_server(port=0)
        fixture_thread = threading.Thread(target=fixture.serve_forever, daemon=True)
        fixture_thread.start()
        fixture_url = f"http://127.0.0.1:{fixture.server_address[1]}"

        if args.self_host:
            server = create_server(host=args.host, port=args.port)
            server_thread = threading.Thread(target=server.serve_forever, daemon=True)
            server_thread.start()
            time.sleep(0.1)

        base_url = f"http://{args.host}:{args.port}"
        measurements = [
            _measure("health", args.iterations, lambda: _get(f"{base_url}/health")),
            _measure(
                "provider-health",
                args.iterations,
                lambda: _get(f"{base_url}/api/provider-health?provider=openai-compatible&apiUrl={fixture_url}"),
            ),
            _measure(
                "mes-retrieve",
                args.iterations,
                lambda: _post_json(
                    f"{base_url}/api/mes/retrieve",
                    {"query": "genealogy traceability", "domains": ["isa-95"], "dataset_ids": ["isa95-core"], "limit": 3},
                ),
            ),
            _measure(
                "mes-log-slim",
                args.iterations,
                lambda: _post_json(
                    f"{base_url}/api/mes/log-slim",
                    {
                        "text": "\n".join(
                            [
                                "2026-04-03T08:00:01Z LINE1 ALARM 42 ACTIVE",
                                "2026-04-03T08:00:02Z LINE1 ALARM 42 ACTIVE",
                                "2026-04-03T08:00:03Z Batch=42 started by operator=anne",
                                "2026-04-03T08:00:04Z LINE1 ALARM 42 ACTIVE",
                                "2026-04-03T08:00:05Z Batch=42 started by operator=anne",
                            ]
                        ),
                        "preserve_tokens": ["Batch=42", "operator"],
                        "max_lines": 4,
                    },
                ),
            ),
            _measure(
                "orchestrate",
                args.iterations,
                lambda: _post_json(
                    f"{base_url}/api/orchestrate",
                    {
                        "prompt": "Review MES release flow for operator approvals and genealogy capture.",
                        "provider": "ollama",
                        "model": "qwen2.5-coder:7b",
                        "roles": ["plc-analyst", "devops", "safety"],
                        "context": {"workspace_root": str(Path.cwd())},
                    },
                ),
            ),
            _measure(
                "screen-review",
                args.iterations,
                lambda: _post_json(
                    f"{base_url}/api/mes/interpret-screen",
                    {
                        "title": "Mixer release screen",
                        "notes": "Alarm banner visible. Manual mode lit. Batch 42 recipe screen open with release hold indicator.",
                        "visible_labels": ["ALARM 42", "MANUAL MODE", "Batch 42", "Release Hold"],
                    },
                ),
            ),
        ]

        print(json.dumps({"base_url": base_url, "results": measurements}, indent=2))
        return 0
    finally:
        if server is not None:
            server.shutdown()
            server.server_close()
        if server_thread is not None:
            server_thread.join(timeout=2)
        if fixture is not None:
            fixture.shutdown()
            fixture.server_close()
        if fixture_thread is not None:
            fixture_thread.join(timeout=2)


if __name__ == "__main__":
    raise SystemExit(main())
