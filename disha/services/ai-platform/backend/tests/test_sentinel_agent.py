import sys
from pathlib import Path

# Path setup
_THIS = Path(__file__).resolve()
_REPO_ROOT = _THIS.parents[4]  # disha/services/ai-platform/backend/tests -> disha/services/ai-platform/backend -> disha/services/ai-platform -> disha/services -> disha -> root
_BACKEND = _THIS.parents[1]

for p in [str(_REPO_ROOT), str(_BACKEND)]:
    if p not in sys.path:
        sys.path.insert(0, p)

import pytest  # noqa: E402
from unittest.mock import AsyncMock, patch  # noqa: E402
from app.agents.sentinel_agent import SentinelAgent  # noqa: E402


@pytest.fixture
def agent():
    """Create a SentinelAgent instance."""
    return SentinelAgent()


@pytest.mark.asyncio
async def test_sentinel_execution_with_mock_report(agent):
    """Test the SentinelAgent's ability to process signals and return a structured report."""
    target_ip = "192.168.1.100"
    signals = ["Multiple failed login attempts", "Suspicious lateral movement"]

    with patch.object(agent, "_generate_report", new_callable=AsyncMock) as mock_report:
        expected_report = "1. **Threat Summary**: High risk\n2. **Confidence**: High"
        mock_report.return_value = expected_report

        result = await agent.execute(
            target=target_ip,
            options={"signals": signals, "context": "Network segment B"},
        )

        assert result["target"] == target_ip
        assert result["incident_report"] == expected_report
        assert result["is_security_alert"] is True
        assert result["defense_mode_active"] is True
        mock_report.assert_called_once()


@pytest.mark.asyncio
async def test_sentinel_prompt_generation(agent):
    """Ensure the defensive prompt is generated with correct data."""
    target = "server-01"
    signals = ["malware signature detected"]
    context = "Production database"

    prompt = agent._build_sentinel_prompt(target, signals, context)

    # Verify core rules are present in the prompt
    assert "NEVER provide offensive hacking steps." in prompt
    assert "NEVER suggest retaliation." in prompt
    assert target in prompt
    assert signals[0] in prompt
    assert context in prompt
