from __future__ import annotations

from ..models.schemas import Plan, ReasoningStep, UserCommand


class ReasoningBrain:
    """
    LLM-ready reasoning interface with deterministic fallback.
    In production, replace `_heuristic_plan` with provider-backed structured output.
    """

    def create_plan(self, command: UserCommand, memory: list[dict]) -> Plan:
        return self._heuristic_plan(command, memory)

    def _heuristic_plan(self, command: UserCommand, memory: list[dict]) -> Plan:
        text = command.text.strip()
        normalized = text.lower()
        steps: list[ReasoningStep] = []
        intent = "general"
        summary = "Provide a safe response"
        requires_confirmation = False

        if "list" in normalized and "file" in normalized:
            intent = "filesystem_list"
            summary = "List files in the requested directory"
            steps.append(
                ReasoningStep(
                    order=1,
                    title="Inspect directory",
                    tool="list_files",
                    input={"path": "."},
                )
            )
        elif "read" in normalized and "file" in normalized:
            intent = "filesystem_read"
            summary = "Read a file from the workspace"
            target = text.split("file", 1)[-1].strip() or "README.md"
            steps.append(
                ReasoningStep(
                    order=1, title="Read file", tool="read_file", input={"path": target}
                )
            )
        elif "status" in normalized or "metrics" in normalized:
            intent = "system_status"
            summary = "Retrieve latest telemetry and risk posture"
            steps.append(
                ReasoningStep(
                    order=1,
                    title="Get latest telemetry",
                    tool="latest_events",
                    input={},
                )
            )
        else:
            summary = "Respond with a safe explanation and no tool execution"
            steps.append(
                ReasoningStep(order=1, title="Explain response", tool=None, input={})
            )

        if "delete" in normalized or "write" in normalized or "run" in normalized:
            requires_confirmation = True

        if memory:
            summary = f"{summary}. Use prior context when relevant."

        return Plan(
            intent=intent,
            summary=summary,
            steps=steps,
            requires_confirmation=requires_confirmation,
        )
