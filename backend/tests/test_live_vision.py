import os
import unittest

from agclaw_backend import mes_services


def _enabled():
    return os.getenv("AGCLAW_LIVE_VISION") == "1"


@unittest.skipUnless(_enabled(), "Set AGCLAW_LIVE_VISION=1 and configure vision env vars to run live vision checks.")
class LiveVisionTests(unittest.TestCase):
    def test_qwen_vl_openai_compatible(self):
        base = os.getenv("AGCLAW_SCREEN_VISION_BASE_URL")
        model = os.getenv("AGCLAW_SCREEN_VISION_MODEL")
        if not base or not model:
            self.skipTest("AGCLAW_SCREEN_VISION_BASE_URL or AGCLAW_SCREEN_VISION_MODEL not set")

        # Use the internal helper to call the configured vision adapter directly.
        provider, summary = mes_services._run_openai_vision("Short advisory check", "data:image/png;base64,ZmFrZQ==")
        self.assertIn(provider, {"openai", "openai-compatible", "github-models", "ollama", "vllm"})
        self.assertTrue(isinstance(summary, str))
        self.assertTrue(len(summary.strip()) > 0, msg="Vision adapter returned empty summary")


if __name__ == "__main__":
    unittest.main()
