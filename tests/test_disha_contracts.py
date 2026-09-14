from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from disha.contracts import (
    Classification,
    DishaClaim,
    DishaEvent,
    DishaEvidence,
    Provenance,
    VerificationStatus,
)


def provenance() -> Provenance:
    return Provenance(
        source="official-test-source",
        source_uri="https://example.gov.in/record/1",
        source_hash="a" * 64,
        collected_at=datetime.now(UTC),
        observed_at=datetime.now(UTC),
        actor="test-collector",
        method="fixture",
    )


def test_canonical_event_retains_provenance_and_policy_context() -> None:
    event = DishaEvent(
        event_id="evt-1",
        timestamp=datetime.now(UTC),
        source="official-test-source",
        source_type="public_record",
        tenant="tenant-1",
        classification=Classification.PUBLIC,
        confidence=0.9,
        provenance=provenance(),
        policy_context={"basis": "public-source research"},
        hash="b" * 64,
    )

    assert event.provenance.source_hash == "a" * 64
    assert event.classification is Classification.PUBLIC
    assert event.policy_context["basis"] == "public-source research"


def test_verified_claim_requires_evidence() -> None:
    with pytest.raises(ValidationError):
        DishaClaim(
            claim_id="claim-1",
            statement="A verified claim without evidence must fail.",
            source="official-test-source",
            confidence=0.95,
            created_at=datetime.now(UTC),
            verification_status=VerificationStatus.VERIFIED,
        )


def test_inference_is_not_silently_promoted_to_verified() -> None:
    claim = DishaClaim(
        claim_id="claim-2",
        statement="This statement is an inference.",
        source="correlation-engine",
        confidence=0.55,
        created_at=datetime.now(UTC),
        verification_status=VerificationStatus.INFERRED,
    )

    assert claim.verification_status is VerificationStatus.INFERRED
    assert claim.evidence_ids == []


def test_evidence_confidence_is_bounded() -> None:
    with pytest.raises(ValidationError):
        DishaEvidence(
            evidence_id="ev-1",
            tenant="tenant-1",
            content_hash="c" * 64,
            provenance=provenance(),
            confidence=1.5,
        )
