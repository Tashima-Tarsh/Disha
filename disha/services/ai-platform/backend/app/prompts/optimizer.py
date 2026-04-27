import random
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class PromptVariant:
    variant_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    template: str = ""
    version: int = 1
    created_at: float = field(default_factory=time.time)
    uses: int = 0
    total_score: float = 0.0
    scores: list = field(default_factory=list)

    @property
    def avg_score(self) -> float:
        return self.total_score / max(self.uses, 1)

    @property
    def confidence(self) -> float:
        return min(self.uses / 20.0, 1.0)


class PromptOptimizer:
    BASE_TEMPLATES = {
        "investigation": (
            "You are an elite intelligence analyst. Analyze the following data "
            "collected about target '{target}'.\n\n"
            "Data collected:\n{data_summary}\n\n"
            "Provide:\n"
            "1. Threat level assessment (LOW/MEDIUM/HIGH/CRITICAL)\n"
            "2. Key indicators of compromise\n"
            "3. Entity connections and patterns\n"
            "4. Recommended immediate actions\n"
            "5. Confidence level in your assessment"
        ),
        "risk_assessment": (
            "As a cybersecurity risk analyst, evaluate the following intelligence "
            "data for target '{target}'.\n\n"
            "Intelligence data:\n{data_summary}\n\n"
            "Assess:\n"
            "1. Risk score (0.0-1.0) with justification\n"
            "2. Attack vectors identified\n"
            "3. Vulnerability exposure\n"
            "4. Potential impact if exploited\n"
            "5. Mitigation recommendations"
        ),
        "pattern_analysis": (
            "You are a pattern recognition specialist. Examine the following "
            "intelligence entities and relationships for '{target}'.\n\n"
            "Entities and relationships:\n{data_summary}\n\n"
            "Identify:\n"
            "1. Behavioral patterns and anomalies\n"
            "2. Hidden connections between entities\n"
            "3. Temporal patterns (if timestamps available)\n"
            "4. Similar known threat patterns\n"
            "5. Predicted next actions by threat actors"
        ),
    }

    def __init__(self, population_size: int = 5):
        self.population_size = population_size
        self.variants: dict = defaultdict(list)
        self.few_shot_examples: dict = defaultdict(list)
        self._generation = 0

        for prompt_type, template in self.BASE_TEMPLATES.items():
            variant = PromptVariant(template=template, version=1)
            self.variants[prompt_type].append(variant)

    def get_prompt(
        self,
        prompt_type: str,
        target: str,
        data_summary: str,
        include_few_shot: bool = True,
    ) -> tuple:
        variants = self.variants.get(prompt_type, [])

        if not variants:
            template = self.BASE_TEMPLATES.get(
                prompt_type, self.BASE_TEMPLATES["investigation"]
            )
            variant = PromptVariant(template=template)
            self.variants[prompt_type] = [variant]
            variants = [variant]

        selected = self._thompson_select(variants)

        prompt = selected.template.format(
            target=target,
            data_summary=data_summary,
        )

        if include_few_shot:
            examples = self._get_few_shot_examples(prompt_type)
            if examples:
                prompt = self._inject_few_shot(prompt, examples)

        selected.uses += 1

        logger.info(
            "prompt_selected",
            type=prompt_type,
            variant=selected.variant_id,
            version=selected.version,
            avg_score=round(selected.avg_score, 3),
            uses=selected.uses,
        )

        return prompt, selected.variant_id

    def record_score(self, variant_id: str, score: float, prompt_type: str = ""):
        for ptype, variants in self.variants.items():
            if prompt_type and ptype != prompt_type:
                continue
            for variant in variants:
                if variant.variant_id == variant_id:
                    variant.total_score += score
                    variant.scores.append(score)
                    logger.info(
                        "prompt_score_recorded",
                        variant=variant_id,
                        score=round(score, 3),
                        avg_score=round(variant.avg_score, 3),
                    )
                    return

    def add_few_shot_example(
        self, prompt_type: str, example_input: str, example_output: str, score: float
    ):
        examples = self.few_shot_examples[prompt_type]
        examples.append(
            {
                "input": example_input[:500],
                "output": example_output[:500],
                "score": score,
                "timestamp": time.time(),
            }
        )

        examples.sort(key=lambda x: x["score"], reverse=True)
        self.few_shot_examples[prompt_type] = examples[:10]

    def evolve(self):
        self._generation += 1

        for prompt_type, variants in self.variants.items():
            if len(variants) < 2:
                continue

            scored = [v for v in variants if v.uses >= 3]
            if not scored:
                continue

            scored.sort(key=lambda v: v.avg_score, reverse=True)

            if scored:
                mutated = self._mutate(scored[0], prompt_type)
                if mutated and len(variants) < self.population_size:
                    variants.append(mutated)

            if len(scored) >= 2:
                child = self._crossover(scored[0], scored[1], prompt_type)
                if child and len(variants) < self.population_size:
                    variants.append(child)

            if len(variants) > self.population_size:
                worst = min(
                    [v for v in variants if v.uses >= 5],
                    key=lambda v: v.avg_score,
                    default=None,
                )
                if worst:
                    variants.remove(worst)

        logger.info("prompt_evolution_complete", generation=self._generation)

    def _thompson_select(self, variants: list) -> PromptVariant:
        if len(variants) == 1:
            return variants[0]

        best_sample = -float("inf")
        best_variant = variants[0]

        for variant in variants:
            alpha = variant.total_score + 1.0
            beta_param = max(variant.uses - variant.total_score + 1.0, 1.0)
            sample = random.betavariate(
                max(alpha, 0.1),
                max(beta_param, 0.1),
            )
            if sample > best_sample:
                best_sample = sample
                best_variant = variant

        return best_variant

    def _mutate(
        self, parent: PromptVariant, prompt_type: str
    ) -> PromptVariant | None:
        mutations = [
            ("Add specificity", "Be very specific and detailed in your analysis. "),
            (
                "Add urgency",
                "This is a time-sensitive investigation. Prioritize actionable intelligence. ",
            ),
            (
                "Add structure",
                "Structure your response with clear headers and bullet points. ",
            ),
            ("Add confidence", "For each finding, include a confidence percentage. "),
            (
                "Add context",
                "Consider the broader threat landscape and known APT patterns. ",
            ),
        ]

        mutation_name, prefix = random.choice(mutations)

        new_template = prefix + parent.template
        child = PromptVariant(
            template=new_template,
            version=parent.version + 1,
        )

        logger.info(
            "prompt_mutated",
            parent=parent.variant_id,
            child=child.variant_id,
            mutation=mutation_name,
        )

        return child

    def _crossover(
        self, parent1: PromptVariant, parent2: PromptVariant, prompt_type: str
    ) -> PromptVariant | None:

        sections1 = parent1.template.split("\n\n")
        sections2 = parent2.template.split("\n\n")

        child_sections = []
        for i in range(max(len(sections1), len(sections2))):
            if i % 2 == 0 and i < len(sections1):
                child_sections.append(sections1[i])
            elif i < len(sections2):
                child_sections.append(sections2[i])

        if not child_sections:
            return None

        child = PromptVariant(
            template="\n\n".join(child_sections),
            version=max(parent1.version, parent2.version) + 1,
        )

        return child

    def _get_few_shot_examples(self, prompt_type: str, max_examples: int = 3) -> list:
        examples = self.few_shot_examples.get(prompt_type, [])
        return examples[:max_examples]

    def _inject_few_shot(self, prompt: str, examples: list) -> str:
        if not examples:
            return prompt

        example_text = "\n\nHere are examples of high-quality analyses:\n"
        for i, ex in enumerate(examples, 1):
            example_text += f"\nExample {i}:\nInput: {ex['input'][:200]}\nOutput: {ex['output'][:200]}\n"

        return prompt + example_text

    def get_metrics(self) -> dict:
        metrics = {
            "generation": self._generation,
            "prompt_types": {},
        }

        for prompt_type, variants in self.variants.items():
            metrics["prompt_types"][prompt_type] = {
                "variants": len(variants),
                "total_uses": sum(v.uses for v in variants),
                "best_score": max(
                    (v.avg_score for v in variants if v.uses > 0), default=0
                ),
                "few_shot_examples": len(self.few_shot_examples.get(prompt_type, [])),
            }

        return metrics
