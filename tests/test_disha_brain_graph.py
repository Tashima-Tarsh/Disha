from __future__ import annotations

import sys

import pytest

from disha.brain.audit import AuditEvent, AuditLedger
from disha.brain.evidence import EvidenceClass, build_evidence_bundle
from disha.brain.geospatial import Coordinates, TrackedObject
from disha.brain.graph import DishaAgenticGraph, GraphInput
from disha.brain.graph.router import route_version
from disha.brain.memory import MemoryStore
from disha.brain.policy import evaluate_actions
from disha.brain.policy.no_first_use import NFUDecision
from disha.brain.versions import v4_6_hse, v5_6_national_audit
from disha.brain.vyuha import select_vyuha


def test_brain_package_import_is_lazy() -> None:
    assert "disha.brain.app" not in sys.modules
    assert "fastapi" not in sys.modules


def test_evidence_classification_official_record() -> None:
    bundle = build_evidence_bundle(
        ["Government notification hosted on gov.in"],
        "government_open_data",
        ["https://example.gov.in/order"],
    )
    assert bundle.dominant_class == EvidenceClass.official_record
    assert bundle.confidence.value == "high"


@pytest.mark.parametrize(
    ("text", "version"),
    [
        ("GPS coordinate sensor pattern", "1.6"),
        ("flood impact on bridge infrastructure", "2.6"),
        ("edge device physical interface telemetry", "3.6"),
        ("health and school service gap", "4.6"),
        ("RTI Article 12 public authority audit", "5.6"),
        ("gap mitigation Vyuha Yudh corrective action", "6.6"),
    ],
)
def test_version_routing(text: str, version: str) -> None:
    assert route_version(text) == version


def test_nfu_allowed_actions() -> None:
    result = evaluate_actions(["monitor", "block", "preserve_evidence"], True)
    assert result.decision == NFUDecision.allowed
    assert result.status == "nfu_compliant"


def test_nfu_forbidden_actions() -> None:
    result = evaluate_actions(["hack_back", "ddos"], True)
    assert result.decision == NFUDecision.forbidden
    assert "hack_back" in result.forbidden_actions


def test_human_approval_escalates_ambiguous_action() -> None:
    graph = DishaAgenticGraph()
    result = graph.invoke(
        GraphInput(
            input_text="Investigate public authority audit gap",
            requested_actions=["custom_action"],
        )
    )
    assert result.human_approval_required is True
    assert result.nfu_policy_status == "ambiguous_action_requires_approval"


def test_vyuha_selection() -> None:
    formation = select_vyuha(["national_audit", "constitutional_reference"], 0.2)
    assert formation.name == "NYAYA Audit Vyuha"


def test_audit_ledger_creation() -> None:
    ledger = AuditLedger()
    event = ledger.append(AuditEvent(event_id="e1", action="test", outcome="ok"))
    assert event.event_id == "e1"
    assert ledger.latest_hash != "GENESIS"


def test_memory_update() -> None:
    memory = MemoryStore()
    memory.update_from_result("health gap", "4.6", "report")
    assert memory.working.context["last_version"] == "4.6"
    assert memory.episodic.items[0].final_answer == "report"


def test_geospatial_coordinate_validation_and_tracking() -> None:
    tracker = TrackedObject(object_id="asset")
    tracker.add(Coordinates(latitude=28.6139, longitude=77.209, accuracy_m=10))
    assert tracker.status() == "single_or_sparse_signal"
    with pytest.raises(ValueError):
        Coordinates(latitude=120, longitude=77.209)


def test_national_audit_evidence_classification() -> None:
    output = v5_6_national_audit.run("RTI and Article 12 record mismatch")
    assert output.version == "5.6"
    assert "national_audit" in output.signals


def test_hse_service_gap_output() -> None:
    output = v4_6_hse.run("health welfare education district gap")
    assert output.version == "4.6"
    assert "health_service_gap" in output.signals
    assert "education_access_gap" in output.signals


@pytest.mark.parametrize(
    ("text", "source_type", "expected_version"),
    [
        ("coordinates from sensor near restricted perimeter", "sensor", "1.6"),
        ("flood impact on bridge infrastructure", "government_open_data", "2.6"),
        ("edge telemetry from physical device", "sensor", "3.6"),
        ("district health and education service gap", "document", "4.6"),
        ("RTI Article 12 public authority contradiction", "rti_record", "5.6"),
        ("gap mitigation needs Vyuha and Yudh", "audit_report", "6.6"),
    ],
)
def test_end_to_end_graph_invocation(
    text: str, source_type: str, expected_version: str
) -> None:
    graph = DishaAgenticGraph()
    result = graph.invoke(
        GraphInput(
            input_text=text,
            source_type=source_type,
            requested_actions=["report", "preserve_evidence"],
            authorized_environment=True,
        )
    )
    assert result.version == expected_version
    assert result.audit_event.action == "disha_graph_run"
    assert result.final_recommendation
    assert result.nfu_policy_status == "nfu_compliant"
