"""
AgentDeliberator — Multi-Agent Deliberation for the DISHA Cognitive Engine.

Implements a three-agent deliberation architecture:

  1. Planner Agent   — Breaks the goal into ordered strategic steps.
  2. Executor Agent  — Converts the plan into a concrete, immediately actionable step.
  3. Critic Agent    — Reviews quality, flags risks, and assigns a confidence score.

The three agent outputs are combined via confidence-weighted voting to produce a
consensus recommendation. Dissenting views are preserved for metacognitive review.

Role in architecture:
    AgentDeliberator is called during the _deliberate phase of the cognitive loop.
    It takes the current CognitiveState (with hypotheses and working memory) and
    returns a structured deliberation dict used to select the final action.
"""

from __future__ import annotations

import asyncio
import re
import time
from typing import TYPE_CHECKING, Any

import structlog

log = structlog.get_logger(__name__)

if TYPE_CHECKING:
    from cognitive_engine.cognitive_loop import CognitiveState


# ---------------------------------------------------------------------------
# Heuristic knowledge base used by rule-based agents
# (Replace with real LLM calls by swapping _call_llm stubs below)
# ---------------------------------------------------------------------------

# Intent → strategic goal templates
_STRATEGIC_TEMPLATES: dict[str, list[str]] = {
    "question": [
        "Identify the core information need",
        "Search episodic and semantic memory for relevant context",
        "Formulate a precise, accurate answer",
        "Validate answer against known constraints",
        "Deliver response with appropriate confidence disclosure",
    ],
    "command": [
        "Parse the command into discrete sub-tasks",
        "Assess feasibility and resource requirements",
        "Execute sub-tasks in dependency order",
        "Verify each step succeeded before proceeding",
        "Report completion status with outcomes",
    ],
    "creative": [
        "Understand the creative brief and constraints",
        "Generate multiple divergent ideas",
        "Evaluate ideas against the brief",
        "Synthesize the strongest elements",
        "Produce a coherent creative output",
    ],
    "analysis": [
        "Define the scope and key dimensions of analysis",
        "Gather relevant data from memory and context",
        "Apply analytical framework (compare, contrast, evaluate)",
        "Draw evidence-based conclusions",
        "Present findings with confidence intervals",
    ],
    "conversation": [
        "Identify the social/emotional register of the exchange",
        "Recall relevant context from prior conversation",
        "Formulate a contextually appropriate response",
        "Check for empathy and tone alignment",
        "Deliver the response naturally",
    ],
    "default": [
        "Clarify the user's underlying goal",
        "Gather relevant context from memory",
        "Formulate a response or action",
        "Validate quality and appropriateness",
        "Execute and confirm",
    ],
}

# Executor action types keyed by intent
_EXECUTOR_ACTIONS: dict[str, str] = {
    "question": "retrieve_and_synthesize",
    "command": "execute_command_pipeline",
    "creative": "generate_creative_artifact",
    "analysis": "perform_structured_analysis",
    "conversation": "generate_conversational_response",
    "default": "respond_with_clarification",
}

# Critic risk heuristics: keywords → risk flags
_RISK_KEYWORDS: list[tuple[str, str]] = [
    (r"\bharm|danger|risk|attack|exploit\b", "potential_harm_detected"),
    (r"\buncertain|unclear|ambiguous|vague\b", "low_clarity_input"),
    (r"\bprivate|secret|confidential|personal\b", "privacy_concern"),
    (r"\bnever|always|everyone|nobody\b", "absolute_claim_detected"),
    (r"\bfake|false|wrong|incorrect\b", "potential_misinformation"),
    (r"\bdeadline|urgent|emergency|immediately\b", "urgency_pressure"),
]


# ---------------------------------------------------------------------------
# LLM stub (plug in real LLM here)
# ---------------------------------------------------------------------------

async def _call_llm(prompt: str, role: str = "assistant") -> str:
    """
    Stub for real LLM API calls.

    TODO: Replace this stub with actual LLM calls, e.g.:
        import openai
        response = await openai.ChatCompletion.acreate(
            model="gpt-4o",
            messages=[{"role": "system", "content": role}, {"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content

    Currently returns None to signal that rule-based fallback should be used.
    """
    return ""  # Empty string → use rule-based fallback


# ---------------------------------------------------------------------------
# AgentDeliberator
# ---------------------------------------------------------------------------


class AgentDeliberator:
    """
    Runs three cognitive agents in parallel and produces a consensus decision.

    Each agent is an async method that takes a CognitiveState and returns:
        {
            "agent": str,
            "recommendation": str,
            "confidence": float,
            "reasoning": str,
            "concerns": list[str],
            "timestamp": float,
        }

    The _vote method performs confidence-weighted selection and preserves
    any dissenting minority views.
    """

    def __init__(self) -> None:
        log.info("agent_deliberator.initialized")

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def deliberate(self, state: "CognitiveState") -> dict[str, Any]:
        """
        Run Planner, Executor, and Critic agents concurrently, then vote.

        Args:
            state: Current CognitiveState from the cognitive loop.

        Returns:
            {
                "winner": dict,               # Winning agent opinion
                "all_opinions": list[dict],   # All three agent outputs
                "consensus_confidence": float,
                "dissenting_view": dict | None,
                "recommended_action": str,
                "timestamp": float,
            }
        """
        log.info(
            "agent_deliberator.deliberating",
            session_id=state.session_id,
            turn=state.turn,
            intent=state.intent,
        )

        # Run all three agents in parallel
        planner_out, executor_out, critic_out = await asyncio.gather(
            self._planner_agent(state),
            self._executor_agent(state),
            self._critic_agent(state),
        )

        all_opinions = [planner_out, executor_out, critic_out]
        result = self._vote(all_opinions)

        log.info(
            "agent_deliberator.consensus_reached",
            winner=result["winner"]["agent"],
            confidence=result["consensus_confidence"],
            dissent=result["dissenting_view"] is not None,
        )
        return result

    # ------------------------------------------------------------------
    # Agent methods
    # ------------------------------------------------------------------

    async def _planner_agent(self, state: "CognitiveState") -> dict[str, Any]:
        """
        Strategic Planner: decompose the intent into ordered goal steps.

        TODO: Replace rule-based logic with LLM call:
            prompt = f"You are a strategic planner. Given intent '{state.intent}' and
                      context {state.context}, decompose this into 3-5 ordered steps..."
            response = await _call_llm(prompt, role="strategic planner")
        """
        intent = state.intent or "default"
        steps = _STRATEGIC_TEMPLATES.get(intent, _STRATEGIC_TEMPLATES["default"])

        # Adjust confidence based on how well the intent was classified
        base_confidence = 0.75
        if state.context.get("intent_confidence", 0.0) > 0.8:
            base_confidence = 0.85
        elif state.context.get("intent_confidence", 0.0) < 0.4:
            base_confidence = 0.55

        # Factor in hypothesis quality
        if state.hypotheses:
            avg_hyp_confidence = sum(
                h.get("confidence", 0.5) for h in state.hypotheses
            ) / len(state.hypotheses)
            base_confidence = (base_confidence + avg_hyp_confidence) / 2

        concerns: list[str] = []
        if len(steps) > 4:
            concerns.append("multi_step_plan_may_require_clarification")
        if state.context.get("uncertainty_level", 0) > 0.6:
            concerns.append("high_uncertainty_may_affect_plan_execution")

        plan_text = " → ".join(f"Step {i+1}: {s}" for i, s in enumerate(steps))
        recommendation = f"Execute {len(steps)}-step plan: {plan_text}"

        return {
            "agent": "planner",
            "recommendation": recommendation,
            "plan_steps": steps,
            "confidence": round(base_confidence, 3),
            "reasoning": (
                f"Intent classified as '{intent}'. Applied strategic template with "
                f"{len(steps)} steps. Confidence adjusted for input clarity."
            ),
            "concerns": concerns,
            "timestamp": time.time(),
        }

    async def _executor_agent(self, state: "CognitiveState") -> dict[str, Any]:
        """
        Executor Agent: produce a concrete, immediately actionable step.

        TODO: Replace rule-based logic with LLM call:
            prompt = f"You are an executor agent. Given the plan {plan} and current
                      context {state.context}, what is the single most important
                      action to take RIGHT NOW? Be specific and concrete."
            response = await _call_llm(prompt, role="executor agent")
        """
        intent = state.intent or "default"
        action_type = _EXECUTOR_ACTIONS.get(intent, _EXECUTOR_ACTIONS["default"])

        # Derive concrete step from best hypothesis
        best_hyp: dict[str, Any] = {}
        if state.hypotheses:
            best_hyp = max(state.hypotheses, key=lambda h: h.get("confidence", 0))

        immediate_action: str
        if best_hyp:
            hyp_text = best_hyp.get("hypothesis", "")
            immediate_action = (
                f"[{action_type.upper()}] {hyp_text[:200]}"
                if hyp_text
                else f"[{action_type.upper()}] Process input using {intent} handling pipeline"
            )
        else:
            immediate_action = (
                f"[{action_type.upper()}] Process input using {intent} handling pipeline"
            )

        # Confidence is driven by hypothesis confidence + working memory richness
        wm_richness = min(1.0, len(state.working_memory) / 8)
        hyp_conf = best_hyp.get("confidence", 0.6) if best_hyp else 0.6
        confidence = round((hyp_conf * 0.7) + (wm_richness * 0.3), 3)

        concerns: list[str] = []
        if not state.working_memory:
            concerns.append("insufficient_context_in_working_memory")
        if hyp_conf < 0.5:
            concerns.append("low_confidence_hypothesis_may_produce_poor_output")

        return {
            "agent": "executor",
            "recommendation": immediate_action,
            "action_type": action_type,
            "confidence": confidence,
            "reasoning": (
                f"Selected '{action_type}' action pipeline based on intent '{intent}'. "
                f"Immediate step derived from best hypothesis (conf={hyp_conf:.2f}). "
                f"Working memory richness={wm_richness:.2f}."
            ),
            "concerns": concerns,
            "timestamp": time.time(),
        }

    async def _critic_agent(self, state: "CognitiveState") -> dict[str, Any]:
        """
        Critic Agent: quality-check the proposed plan/action, identify risks.

        TODO: Replace rule-based logic with LLM call:
            prompt = f"You are a critical reviewer. Evaluate the proposed action
                      '{proposed_action}' for quality, risks, and confidence.
                      Input: '{state.raw_input}'. Context: {state.context}."
            response = await _call_llm(prompt, role="critic agent")
        """
        raw = state.raw_input or ""

        # Scan for risk keywords
        risk_flags: list[str] = []
        for pattern, flag in _RISK_KEYWORDS:
            if re.search(pattern, raw, re.IGNORECASE):
                risk_flags.append(flag)

        # Evaluate reasoning quality
        quality_signals: list[str] = []
        confidence_penalty = 0.0

        if state.hypotheses and len(state.hypotheses) >= 3:
            quality_signals.append("multi_modal_reasoning_active")
        else:
            confidence_penalty += 0.1
            quality_signals.append("insufficient_hypothesis_diversity")

        if state.working_memory:
            quality_signals.append("working_memory_populated")
        else:
            confidence_penalty += 0.05
            quality_signals.append("empty_working_memory")

        if state.context.get("entities"):
            quality_signals.append("entities_extracted")
        else:
            quality_signals.append("no_entities_detected")

        # Base critic confidence: start high, deduct for each risk
        base_confidence = 0.80 - (len(risk_flags) * 0.08) - confidence_penalty

        # Cross-check against hypotheses
        if state.hypotheses:
            hyp_confs = [h.get("confidence", 0.5) for h in state.hypotheses]
            avg_hyp = sum(hyp_confs) / len(hyp_confs)
            base_confidence = (base_confidence + avg_hyp) / 2

        base_confidence = max(0.1, min(0.99, base_confidence))

        all_concerns = risk_flags + [
            s for s in quality_signals if s.startswith("insufficient") or s.startswith("empty")
        ]

        recommendation: str
        if base_confidence >= 0.7:
            recommendation = "APPROVE — quality checks passed, proceed with action"
        elif base_confidence >= 0.5:
            recommendation = "CONDITIONAL_APPROVE — proceed with caution, monitor outcomes"
        else:
            recommendation = "REJECT — insufficient confidence, request clarification"

        return {
            "agent": "critic",
            "recommendation": recommendation,
            "quality_signals": quality_signals,
            "risk_flags": risk_flags,
            "confidence": round(base_confidence, 3),
            "reasoning": (
                f"Scanned input for {len(_RISK_KEYWORDS)} risk patterns, "
                f"found {len(risk_flags)} flags. "
                f"Quality signals: {', '.join(quality_signals) or 'none'}. "
                f"Base confidence after deductions: {base_confidence:.2f}."
            ),
            "concerns": all_concerns,
            "timestamp": time.time(),
        }

    # ------------------------------------------------------------------
    # Voting mechanism
    # ------------------------------------------------------------------

    def _vote(self, opinions: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Confidence-weighted vote across agent opinions.

        The winner is the agent with the highest confidence score. If the
        critic REJECTS (confidence < 0.5), it acts as a veto regardless of
        other scores. The dissenting view is the opinion furthest from the
        winner in confidence space.

        Args:
            opinions: List of agent output dicts (each with 'confidence').

        Returns:
            {
                "winner": dict,
                "all_opinions": list[dict],
                "consensus_confidence": float,
                "dissenting_view": dict | None,
                "recommended_action": str,
                "timestamp": float,
            }
        """
        if not opinions:
            return {
                "winner": {},
                "all_opinions": [],
                "consensus_confidence": 0.0,
                "dissenting_view": None,
                "recommended_action": "no_action",
                "timestamp": time.time(),
            }

        # Check for critic veto
        critic_opinion = next((o for o in opinions if o.get("agent") == "critic"), None)
        if critic_opinion and critic_opinion.get("confidence", 1.0) < 0.5:
            # Critic veto: executor's action is blocked
            log.warning(
                "agent_deliberator.critic_veto",
                confidence=critic_opinion.get("confidence"),
                concerns=critic_opinion.get("concerns"),
            )
            # Override: use critic's conservative recommendation
            executor_opinion = next((o for o in opinions if o.get("agent") == "executor"), None)
            dissent = executor_opinion if executor_opinion else None

            total_weight = sum(o.get("confidence", 0.5) for o in opinions)
            consensus = total_weight / len(opinions)

            return {
                "winner": critic_opinion,
                "all_opinions": opinions,
                "consensus_confidence": round(consensus, 3),
                "dissenting_view": dissent,
                "recommended_action": "request_clarification_or_abort",
                "veto_active": True,
                "timestamp": time.time(),
            }

        # Normal weighted vote
        winner = max(opinions, key=lambda o: o.get("confidence", 0.0))

        # Consensus confidence = weighted average of all agents
        total_weight = sum(o.get("confidence", 0.0) for o in opinions)
        consensus_conf = total_weight / len(opinions)

        # Dissenting view: the opinion with the greatest deviation from winner
        winner_conf = winner.get("confidence", 0.0)
        others = [o for o in opinions if o is not winner]
        dissent: dict[str, Any] | None = None
        if others:
            dissent = max(others, key=lambda o: abs(o.get("confidence", 0.0) - winner_conf))
            # Only preserve as dissent if the gap is significant
            if abs(dissent.get("confidence", 0.0) - winner_conf) < 0.1:
                dissent = None  # Opinions are too close to matter

        # Extract a clean recommended_action string
        recommended_action = winner.get("action_type") or winner.get("recommendation", "respond")

        return {
            "winner": winner,
            "all_opinions": opinions,
            "consensus_confidence": round(consensus_conf, 3),
            "dissenting_view": dissent,
            "recommended_action": recommended_action,
            "veto_active": False,
            "timestamp": time.time(),
        }
