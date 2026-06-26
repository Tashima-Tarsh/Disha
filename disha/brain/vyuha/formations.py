from __future__ import annotations

from pydantic import BaseModel


class VyuhaFormation(BaseModel):
    name: str
    triggers: list[str]
    allowed_actions: list[str]
    forbidden_actions: list[str]
    evidence_requirements: list[str]
    fallback_behavior: str
    recovery_path: str
    audit_requirements: list[str]
    human_approval_required: bool = False


FORMATIONS: list[VyuhaFormation] = [
    VyuhaFormation(
        name="Nakshatra Mandala Vyuha",
        triggers=["geospatial", "sensor_signal"],
        allowed_actions=["monitor", "preserve_evidence", "alert"],
        forbidden_actions=["unauthorized_scan", "attack_third_party"],
        evidence_requirements=["coordinates", "timestamped sensor evidence"],
        fallback_behavior="hold for human review when coordinates are missing",
        recovery_path="publish public-safety evidence bundle",
        audit_requirements=["source list", "risk score", "operator decision"],
    ),
    VyuhaFormation(
        name="Agni Vyuha",
        triggers=["high_risk", "containment"],
        allowed_actions=["block", "contain", "quarantine", "preserve_evidence"],
        forbidden_actions=["destructive_retaliation", "deploy_malware"],
        evidence_requirements=["risk reason", "affected asset", "containment boundary"],
        fallback_behavior="rate limit and alert",
        recovery_path="restore service after verified containment",
        audit_requirements=["NFU decision", "containment scope"],
        human_approval_required=True,
    ),
    VyuhaFormation(
        name="Chakra Vyuha",
        triggers=["cyber", "telemetry"],
        allowed_actions=["monitor", "rate_limit", "revoke_session"],
        forbidden_actions=["hack_back", "brute_force"],
        evidence_requirements=["telemetry", "session metadata"],
        fallback_behavior="monitor only",
        recovery_path="rotate credentials and close sessions",
        audit_requirements=["session evidence", "approval if user impact"],
    ),
    VyuhaFormation(
        name="Padma Vyuha",
        triggers=["hse", "service_gap"],
        allowed_actions=["report", "preserve_evidence", "alert"],
        forbidden_actions=["unauthorized_access"],
        evidence_requirements=["district signal", "service category", "source list"],
        fallback_behavior="mark unverified gaps as [VERIFY REQUIRED]",
        recovery_path="issue public-service evidence report",
        audit_requirements=["evidence class", "confidence level"],
    ),
    VyuhaFormation(
        name="Sarpa Vyuha",
        triggers=["contradiction", "audit"],
        allowed_actions=["preserve_evidence", "report"],
        forbidden_actions=["destructive_retaliation"],
        evidence_requirements=["conflicting records", "source links"],
        fallback_behavior="do not resolve contradiction without source review",
        recovery_path="create contradiction register",
        audit_requirements=["record hashes", "review status"],
    ),
    VyuhaFormation(
        name="Shyena Vyuha",
        triggers=["rapid_response", "sensor"],
        allowed_actions=["alert", "monitor", "contain"],
        forbidden_actions=["unauthorized_scan"],
        evidence_requirements=["sensor signal", "operator scope"],
        fallback_behavior="alert only",
        recovery_path="handoff to authorized operator",
        audit_requirements=["time-to-alert"],
    ),
    VyuhaFormation(
        name="Mandala Vyuha",
        triggers=["multi_sector", "coordination"],
        allowed_actions=["report", "alert", "preserve_evidence"],
        forbidden_actions=["unauthorized_access"],
        evidence_requirements=["sector context", "responsibility map"],
        fallback_behavior="split into sector reports",
        recovery_path="coordinate lawful remediation",
        audit_requirements=["sector owners", "action status"],
    ),
    VyuhaFormation(
        name="Sarvatobhadra Vyuha",
        triggers=["critical_public_risk", "high"],
        allowed_actions=["block", "contain", "alert", "recover"],
        forbidden_actions=["hack_back", "ddos", "auth_bypass"],
        evidence_requirements=["high-risk evidence bundle"],
        fallback_behavior="human approval before action beyond alerting",
        recovery_path="restore public-interest service safely",
        audit_requirements=["approval record", "NFU gate"],
        human_approval_required=True,
    ),
    VyuhaFormation(
        name="NYAYA Audit Vyuha",
        triggers=["national_audit", "constitutional_reference", "rti_record"],
        allowed_actions=["report", "preserve_evidence"],
        forbidden_actions=["unauthorized_access"],
        evidence_requirements=["official source", "constitutional mapping"],
        fallback_behavior="mark unsupported claims as [VERIFY REQUIRED]",
        recovery_path="publish governance accountability report",
        audit_requirements=["source provenance", "contradiction register"],
    ),
    VyuhaFormation(
        name="SETU-VARUNA Resilience Vyuha",
        triggers=["development", "climate", "resilience"],
        allowed_actions=["report", "alert", "preserve_evidence"],
        forbidden_actions=["destructive_retaliation"],
        evidence_requirements=["asset map", "climate/resource signal"],
        fallback_behavior="prioritize verifiable public assets",
        recovery_path="resilience improvement plan",
        audit_requirements=["resilience score", "source list"],
    ),
    VyuhaFormation(
        name="HSE Equity Vyuha",
        triggers=["health", "social_welfare", "education", "hse"],
        allowed_actions=["report", "alert", "preserve_evidence"],
        forbidden_actions=["unauthorized_access"],
        evidence_requirements=["health/social/education signal"],
        fallback_behavior="avoid individual-level claims without consented source",
        recovery_path="district-level service gap report",
        audit_requirements=["privacy review", "evidence class"],
    ),
    VyuhaFormation(
        name="Gap Closure Vyuha",
        triggers=["gap_closure", "mitigation"],
        allowed_actions=["report", "alert", "recover", "preserve_evidence"],
        forbidden_actions=["hack_back", "unauthorized_scan"],
        evidence_requirements=["gap model", "risk mitigation plan"],
        fallback_behavior="lawful corrective action only",
        recovery_path="track closure with human approval when required",
        audit_requirements=["gap status", "NFU status"],
        human_approval_required=True,
    ),
]

