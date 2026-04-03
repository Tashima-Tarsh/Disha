import json
import threading
import time
import unittest
from urllib.request import Request, urlopen

from agclaw_backend.http_api import create_server
from agclaw_backend.test_fixtures import create_openai_fixture_server


class BackendHttpApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.fixture = create_openai_fixture_server(port=0)
        cls.fixture_port = cls.fixture.server_address[1]
        cls.fixture_thread = threading.Thread(target=cls.fixture.serve_forever, daemon=True)
        cls.fixture_thread.start()

        cls.server = create_server(port=0)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.05)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)
        cls.fixture.shutdown()
        cls.fixture.server_close()
        cls.fixture_thread.join(timeout=2)

    def _url(self, path: str) -> str:
        return f"http://127.0.0.1:{self.port}{path}"

    def _fixture_url(self) -> str:
        return f"http://127.0.0.1:{self.fixture_port}"

    def test_health_endpoint(self) -> None:
        with urlopen(self._url("/health")) as response:
            payload = json.loads(response.read().decode("utf-8"))
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["service"], "agclaw-backend")

    def test_provider_health_openai_compatible(self) -> None:
        with urlopen(self._url(f"/api/provider-health?provider=openai-compatible&apiUrl={self._fixture_url()}")) as response:
            payload = json.loads(response.read().decode("utf-8"))
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["provider"], "openai-compatible")

    def test_chat_endpoint_returns_fixture_sse(self) -> None:
        request = Request(
            self._url("/api/chat"),
            data=json.dumps(
                {
                    "model": "fixture-model",
                    "messages": [{"role": "user", "content": "review this batch log"}],
                    "settings": {
                        "provider": "openai-compatible",
                        "apiUrl": self._fixture_url(),
                    },
                }
            ).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request) as response:
            payload = response.read().decode("utf-8")
        self.assertIn("Fixture reply: review this batch log", payload)
        self.assertIn("[DONE]", payload)

    def test_chat_endpoint_returns_json_error_for_missing_anthropic_key(self) -> None:
        request = Request(
            self._url("/api/chat"),
            data=json.dumps(
                {
                    "model": "claude-sonnet-4-6",
                    "messages": [{"role": "user", "content": "hello"}],
                    "settings": {"provider": "anthropic", "apiUrl": "https://api.anthropic.com"},
                }
            ).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            urlopen(request)
            self.fail("Expected HTTP error")
        except Exception as error:  # urllib raises HTTPError, but keeping it simple for stdlib-only tests
            self.assertIn("400", str(error))

    def test_mes_log_slim_endpoint(self) -> None:
        request = Request(
            self._url("/api/mes/log-slim"),
            data=json.dumps(
                {
                    "text": "ALARM 1\nALARM 1\nBatch=42 started\nALARM 1\nBatch=42 started",
                    "preserve_tokens": ["Batch=42"],
                    "max_lines": 3,
                }
            ).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request) as response:
            payload = json.loads(response.read().decode("utf-8"))
        self.assertEqual(payload["kept_lines"], 3)
        self.assertIn("Batch=42 started", payload["text"])

    def test_mes_retrieve_endpoint(self) -> None:
        request = Request(
            self._url("/api/mes/retrieve"),
            data=json.dumps({"query": "genealogy traceability", "domains": ["isa-95"], "dataset_ids": ["isa95-core"], "limit": 2}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request) as response:
            payload = json.loads(response.read().decode("utf-8"))
        self.assertGreaterEqual(len(payload["results"]), 1)
        first_result = payload["results"][0]
        self.assertIn("isa-95", [tag.lower() for tag in first_result["tags"]])
        self.assertTrue(
            "genealogy" in first_result["title"].lower()
            or "traceability" in first_result["excerpt"].lower()
        )
        self.assertTrue(any("traceability" in item["excerpt"].lower() or "traceability" in item["title"].lower() for item in payload["results"]))
        self.assertTrue(all(item["dataset_id"] == "isa95-core" for item in payload["results"]))
        self.assertGreaterEqual(len(payload["datasets"]), 1)

    def test_orchestrate_endpoint(self) -> None:
        request = Request(
            self._url("/api/orchestrate"),
            data=json.dumps(
                {
                    "prompt": "Review MES release flow",
                    "provider": "ollama",
                    "model": "qwen2.5-coder:7b",
                    "roles": ["plc-analyst", "safety"],
                    "context": {"workspace_root": "D:/workspace"},
                }
            ).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request) as response:
            payload = json.loads(response.read().decode("utf-8"))
        self.assertTrue(payload["requires_human_review"])
        self.assertIn("Prepared 2 research roles", payload["summary"])
        self.assertEqual(len(payload["role_plans"]), 2)
        self.assertEqual(payload["role_plans"][0]["role"], "plc-analyst")
        self.assertGreaterEqual(len(payload["role_plans"][0]["next_actions"]), 1)
        self.assertGreaterEqual(len(payload["role_plans"][0]["artifacts"]), 1)
        self.assertEqual(payload["role_plans"][0]["artifacts"][0]["review_gate"], "human-review")

        with urlopen(self._url("/api/orchestration/history?limit=5")) as response:
            history_payload = json.loads(response.read().decode("utf-8"))
        self.assertGreaterEqual(len(history_payload["items"]), 1)
        self.assertEqual(history_payload["items"][0]["prompt"], "Review MES release flow")
        detail_id = history_payload["items"][0]["detail_id"]

        with urlopen(self._url(f"/api/orchestration/history/{detail_id}")) as response:
            detail_payload = json.loads(response.read().decode("utf-8"))
        self.assertEqual(detail_payload["id"], detail_id)
        self.assertEqual(detail_payload["prompt"], "Review MES release flow")
        self.assertGreaterEqual(len(detail_payload["role_plans"]), 1)
        self.assertGreaterEqual(len(detail_payload["follow_up_actions"]), 1)

    def test_mes_dataset_catalog_endpoint(self) -> None:
        with urlopen(self._url("/api/mes/datasets")) as response:
            payload = json.loads(response.read().decode("utf-8"))
        self.assertGreaterEqual(len(payload["items"]), 2)
        self.assertTrue(any(item["id"] == "isa95-core" for item in payload["items"]))

    def test_mes_interpret_screen_endpoint(self) -> None:
        request = Request(
            self._url("/api/mes/interpret-screen"),
            data=json.dumps(
                {
                    "title": "Mixer release screen",
                    "notes": "Alarm banner visible. Manual mode lit. Batch 42 recipe screen open with release hold indicator.",
                    "visible_labels": ["ALARM 42", "MANUAL MODE", "Batch 42", "Release Hold"],
                    "image_name": "mixer-release-screen.png",
                    "image_data_url": "data:image/png;base64,ZmFrZQ==",
                }
            ).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request) as response:
            payload = json.loads(response.read().decode("utf-8"))
        self.assertIn("Mixer release screen", payload["summary"])
        self.assertEqual(payload["adapter"], "heuristic")
        self.assertTrue(any("alarm" in observation.lower() for observation in payload["observations"]))
        self.assertTrue(any("manual" in risk.lower() for risk in payload["risks"]))
        self.assertTrue(any("batch id" in item.lower() for item in payload["recommended_follow_up"]))
        self.assertTrue(any("screenshot received" in observation.lower() for observation in payload["observations"]))


if __name__ == "__main__":
    unittest.main()
