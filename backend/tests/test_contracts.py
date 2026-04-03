import unittest

from agclaw_backend.contracts import ChatProvider, MesRetrieveRequest, OrchestratorRole, ResearchContext, ResearchRequest
from agclaw_backend.mes_services import list_mes_datasets, retrieve_mes_context
from agclaw_backend.orchestrator import build_role_assignments, run_research_orchestration
from agclaw_backend.providers import ProviderConfig


class BackendContractTests(unittest.TestCase):
    def test_provider_config_normalizes_url(self) -> None:
        config = ProviderConfig(provider=ChatProvider.OLLAMA, base_url="http://127.0.0.1:11434/")
        self.assertEqual(config.normalized_base_url(), "http://127.0.0.1:11434")
        self.assertFalse(config.requires_api_key())

    def test_anthropic_requires_api_key(self) -> None:
        config = ProviderConfig(provider=ChatProvider.ANTHROPIC, base_url="https://api.anthropic.com")
        self.assertTrue(config.requires_api_key())

    def test_orchestrator_roles_are_built(self) -> None:
        request = ResearchRequest(
            prompt="Review this MES workflow.",
            provider=ChatProvider.OLLAMA,
            model="qwen2.5-coder:7b",
            roles=[OrchestratorRole.PLC_ANALYST, OrchestratorRole.SAFETY],
            context=ResearchContext(workspace_root="D:/workspace"),
        )

        assignments = build_role_assignments(request)
        self.assertEqual(
            [assignment.role for assignment in assignments],
            [OrchestratorRole.PLC_ANALYST, OrchestratorRole.SAFETY],
        )

        response = run_research_orchestration(request)
        self.assertTrue(response.requires_human_review)
        self.assertTrue(any("advisory-only" in finding for finding in response.findings))
        self.assertEqual(len(response.role_plans), 2)
        self.assertGreaterEqual(len(response.role_plans[0].artifacts), 1)
        self.assertEqual(response.role_plans[0].artifacts[0].review_gate, "human-review")

    def test_mes_registry_is_managed(self) -> None:
        datasets = list_mes_datasets()
        self.assertGreaterEqual(len(datasets), 2)
        response = retrieve_mes_context(
            MesRetrieveRequest(
                query="genealogy traceability",
                domains=["isa-95"],
                limit=3,
                dataset_ids=["isa95-core"],
            )
        )
        self.assertTrue(all(item.dataset_id == "isa95-core" for item in response.results))
        self.assertGreaterEqual(len(response.datasets), 1)


if __name__ == "__main__":
    unittest.main()
