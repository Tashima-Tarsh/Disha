from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class VerificationStatus(str, Enum):
    OBSERVED = "OBSERVED"
    VERIFIED = "VERIFIED"
    INFERRED = "INFERRED"
    CORRELATED = "CORRELATED"
    PREDICTED = "PREDICTED"
    UNKNOWN = "UNKNOWN"
    VERIFY_REQUIRED = "VERIFY_REQUIRED"


class Classification(str, Enum):
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    RESTRICTED = "RESTRICTED"
    SENSITIVE = "SENSITIVE"


class Provenance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source: str
    source_uri: str | None = None
    source_hash: str
    collected_at: datetime
    observed_at: datetime | None = None
    actor: str
    method: str | None = None
    parent_reference: str | None = None


class DishaEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evidence_id: str
    tenant: str
    classification: Classification = Classification.PUBLIC
    content_hash: str
    provenance: Provenance
    confidence: float = Field(ge=0.0, le=1.0)
    verification_status: VerificationStatus = VerificationStatus.OBSERVED
    parent_event: str | None = None
    chain_information: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class DishaIndicator(BaseModel):
    model_config = ConfigDict(extra="forbid")

    indicator_id: str
    kind: str
    value: str
    confidence: float = Field(ge=0.0, le=1.0)
    evidence_ids: list[str] = Field(default_factory=list)
    verification_status: VerificationStatus = VerificationStatus.OBSERVED


class DishaEntity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entity_id: str
    entity_type: str
    label: str
    attributes: dict[str, Any] = Field(default_factory=dict)
    aliases: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    verification_status: VerificationStatus = VerificationStatus.UNKNOWN


class DishaRelationship(BaseModel):
    model_config = ConfigDict(extra="forbid")

    relationship_id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: str
    evidence_ids: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    verification_status: VerificationStatus = VerificationStatus.UNKNOWN
    valid_from: datetime | None = None
    valid_to: datetime | None = None


class DishaEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_id: str
    timestamp: datetime
    source: str
    source_type: str
    tenant: str
    classification: Classification = Classification.PUBLIC
    entity_ids: list[str] = Field(default_factory=list)
    indicator_ids: list[str] = Field(default_factory=list)
    location: dict[str, Any] | None = None
    device: dict[str, Any] | None = None
    network: dict[str, Any] | None = None
    process: dict[str, Any] | None = None
    binary: dict[str, Any] | None = None
    observations: list[dict[str, Any]] = Field(default_factory=list)
    relationships: list[DishaRelationship] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    provenance: Provenance
    raw_reference: str | None = None
    policy_context: dict[str, Any] = Field(default_factory=dict)
    hash: str


class DishaClaim(BaseModel):
    model_config = ConfigDict(extra="forbid")

    claim_id: str
    statement: str
    evidence_ids: list[str] = Field(default_factory=list)
    source: str
    confidence: float = Field(ge=0.0, le=1.0)
    created_at: datetime
    policy_context: dict[str, Any] = Field(default_factory=dict)
    verification_status: VerificationStatus = VerificationStatus.VERIFY_REQUIRED

    @model_validator(mode="after")
    def verified_claim_requires_evidence(self) -> "DishaClaim":
        if self.verification_status is VerificationStatus.VERIFIED and not self.evidence_ids:
            raise ValueError("VERIFIED claims require at least one evidence_id")
        return self


class DishaFinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    finding_id: str
    title: str
    statement: str
    claim_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    verification_status: VerificationStatus = VerificationStatus.VERIFY_REQUIRED
    severity: str | None = None


class DishaActionProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action_id: str
    label: str
    action: str
    risk: float = Field(ge=0.0, le=1.0)
    requires_approval: bool = True
    policy_context: dict[str, Any] = Field(default_factory=dict)
    evidence_ids: list[str] = Field(default_factory=list)


class DishaExtension(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    version: str
    capabilities: list[str] = Field(default_factory=list)
    maturity: str
    risk: str
    permissions: list[str] = Field(default_factory=list)
    policy_requirements: list[str] = Field(default_factory=list)
    evidence_behavior: str


class DishaMission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mission_id: str
    tenant: str
    owner: str
    objective: str
    scope: dict[str, Any] = Field(default_factory=dict)
    legal_policy_basis: list[str] = Field(default_factory=list)
    classification: Classification = Classification.PUBLIC
    status: Literal["CREATED", "RUNNING", "PARTIAL", "COMPLETED", "BLOCKED", "FAILED"] = "CREATED"
    evidence_ids: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class DishaCase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    tenant: str
    owner: str
    investigators: list[str] = Field(default_factory=list)
    objectives: list[str] = Field(default_factory=list)
    scope: dict[str, Any] = Field(default_factory=dict)
    legal_policy_basis: list[str] = Field(default_factory=list)
    entity_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    claim_ids: list[str] = Field(default_factory=list)
    finding_ids: list[str] = Field(default_factory=list)
    approvals: list[str] = Field(default_factory=list)
    audit_references: list[str] = Field(default_factory=list)


class DishaReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    report_id: str
    case_id: str | None = None
    mission_id: str | None = None
    title: str
    conclusion: str
    finding_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    counter_evidence_ids: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    uncertainty: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    recommended_verification_steps: list[str] = Field(default_factory=list)
    created_at: datetime
