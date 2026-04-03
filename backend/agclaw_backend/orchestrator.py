from __future__ import annotations

from dataclasses import dataclass

from .contracts import OrchestratorRole, ResearchRequest, ResearchResponse, RoleArtifact, RolePlan


@dataclass(slots=True)
class RoleAssignment:
    role: OrchestratorRole
    objective: str


DEFAULT_ROLE_OBJECTIVES: dict[OrchestratorRole, str] = {
    OrchestratorRole.PLC_ANALYST: "Analyze industrial logic, logs, and MES workflows without issuing control actions.",
    OrchestratorRole.DEVOPS: "Validate integration, automation, and deployment concerns for research infrastructure.",
    OrchestratorRole.SAFETY: "Review prompts and outputs for unsafe or non-compliant industrial recommendations.",
}


def build_role_assignments(request: ResearchRequest) -> list[RoleAssignment]:
    return [RoleAssignment(role=role, objective=DEFAULT_ROLE_OBJECTIVES[role]) for role in request.roles]


def _build_role_plan(role: OrchestratorRole, objective: str, prompt: str) -> RolePlan:
    if role == OrchestratorRole.PLC_ANALYST:
        findings = [
            f"Review control sequence implications for: {prompt}",
            "Check batch genealogy, state transitions, and operator acknowledgement steps.",
        ]
        next_actions = [
            "Identify affected ISA-95 production states.",
            "Verify no recommendation bypasses interlocks or release holds.",
        ]
        artifacts = [
            RoleArtifact(
                kind="checklist",
                title="PLC workflow review checklist",
                body="Validate sequence state transitions, genealogy capture points, alarm preconditions, and operator acknowledgement gates.",
            ),
            RoleArtifact(
                kind="traceability-note",
                title="Batch traceability focus",
                body="Capture batch id, lot lineage, recipe id, and hold/release transitions before proposing workflow changes.",
            ),
        ]
    elif role == OrchestratorRole.DEVOPS:
        findings = [
            "Confirm environment, API routing, and local-model prerequisites.",
            "Assess whether the workflow can be reproduced in the research harness.",
        ]
        next_actions = [
            "Validate provider health and model availability.",
            "Record required test coverage before rollout to other engineers.",
        ]
        artifacts = [
            RoleArtifact(
                kind="runbook",
                title="Research environment validation runbook",
                body="Verify backend health, provider routing, fixture availability, and browser test preconditions before sharing outputs.",
            ),
            RoleArtifact(
                kind="test-matrix",
                title="Change verification matrix",
                body="Run backend unit tests, web type-check/lint/build, Playwright E2E, and buddy determinism checks for each platform change.",
            ),
        ]
    else:
        findings = [
            "Inspect the prompt and resulting advice for unsafe operational shortcuts.",
            "Flag any recommendation that weakens auditability, approvals, or traceability.",
        ]
        next_actions = [
            "Require human review before operational use.",
            "Run the promptfoo safety pack if the output will be reused.",
        ]
        artifacts = [
            RoleArtifact(
                kind="risk-register",
                title="Industrial safety review points",
                body="Document approval steps, interlocks, manual override exposure, and any traceability gaps before operational use.",
            ),
            RoleArtifact(
                kind="approval-gate",
                title="Required review gate",
                body="Treat all outputs as advisory-only until a qualified engineer confirms safety, data integrity, and plant impact.",
            ),
        ]
    return RolePlan(role=role.value, objective=objective, findings=findings, next_actions=next_actions, artifacts=artifacts)


def run_research_orchestration(request: ResearchRequest) -> ResearchResponse:
    assignments = build_role_assignments(request)
    role_plans = [_build_role_plan(assignment.role, assignment.objective, request.prompt) for assignment in assignments]
    findings = [f"Assigned {assignment.role.value}: {assignment.objective}" for assignment in assignments]
    findings.append("Research mode remains advisory-only. No direct plant-floor commands are executed.")
    return ResearchResponse(
        summary=f"Prepared {len(assignments)} research roles for model {request.model}.",
        findings=findings,
        follow_up_actions=[
            "Select provider adapter implementation.",
            "Attach MES retrieval sources before prompting.",
            "Run prompt safety evaluation pack before exposing output to users.",
        ],
        role_plans=role_plans,
    )
