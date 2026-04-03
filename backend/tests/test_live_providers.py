import os
import unittest

from agclaw_backend.contracts import ChatProvider
from agclaw_backend.providers import ProviderConfig, chat_chunks, default_base_url, probe_provider


def _enabled() -> bool:
    return os.getenv("AGCLAW_LIVE_PROVIDER_TESTS") == "1"


@unittest.skipUnless(_enabled(), "Set AGCLAW_LIVE_PROVIDER_TESTS=1 to run live provider checks.")
class LiveProviderTests(unittest.TestCase):
    def test_live_openai_compatible_provider(self) -> None:
        base_url = os.getenv("AGCLAW_LIVE_OPENAI_BASE_URL")
        if not base_url:
            self.skipTest("AGCLAW_LIVE_OPENAI_BASE_URL is not set")

        config = ProviderConfig(
            provider=ChatProvider.OPENAI_COMPATIBLE,
            base_url=base_url,
            api_key=os.getenv("AGCLAW_LIVE_OPENAI_API_KEY", ""),
            local_mode=True,
        )
        probe = probe_provider(config, timeout=15.0)
        self.assertTrue(probe.ok, msg=probe.error or f"Probe failed with status {probe.status}")

        model = os.getenv("AGCLAW_LIVE_OPENAI_MODEL")
        if not model:
            self.skipTest("AGCLAW_LIVE_OPENAI_MODEL is not set")

        chunks = chat_chunks(
            config=config,
            model=model,
            messages=[{"role": "user", "content": "Reply with: OPENAI LIVE OK"}],
            stream=False,
            timeout=60.0,
        )
        combined = "".join(chunk.get("content", "") for chunk in chunks)
        self.assertIn("OPENAI LIVE OK", combined)

    def test_live_anthropic_provider(self) -> None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            self.skipTest("ANTHROPIC_API_KEY is not set")

        config = ProviderConfig(
            provider=ChatProvider.ANTHROPIC,
            base_url=os.getenv("AGCLAW_LIVE_ANTHROPIC_BASE_URL", default_base_url(ChatProvider.ANTHROPIC)),
            api_key=api_key,
            local_mode=False,
        )
        probe = probe_provider(config, timeout=15.0)
        self.assertTrue(probe.ok, msg=probe.error or f"Probe failed with status {probe.status}")

        model = os.getenv("AGCLAW_LIVE_ANTHROPIC_MODEL")
        if not model:
            self.skipTest("AGCLAW_LIVE_ANTHROPIC_MODEL is not set")

        chunks = chat_chunks(
            config=config,
            model=model,
            messages=[{"role": "user", "content": "Reply with: ANTHROPIC LIVE OK"}],
            system_prompt="Respond with the exact requested text and no extra words.",
            stream=False,
            timeout=60.0,
        )
        combined = "".join(chunk.get("content", "") for chunk in chunks)
        self.assertIn("ANTHROPIC LIVE OK", combined)


if __name__ == "__main__":
    unittest.main()
