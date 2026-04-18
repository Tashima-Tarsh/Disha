from typing import Optional
import structlog

logger = structlog.get_logger(__name__)

class MultimodalFusion:

    MODALITY_WEIGHTS = {
        "text": 0.4,
        "vision": 0.35,
        "audio": 0.25,
    }

    def __init__(self):
        self.fusion_history: list = []

    def fuse(
        self,
        text_results: Optional[dict] = None,
        vision_results: Optional[dict] = None,
        audio_results: Optional[dict] = None,
    ) -> dict:
        all_entities = []
        all_risks = []
        modalities_used = []
        correlations = []

        if text_results:
            modalities_used.append("text")
            entities = text_results.get("entities", [])
            for e in entities:
                e["source_modality"] = "text"
            all_entities.extend(entities)
            risk = text_results.get("risk_score", 0.0)
            all_risks.append(("text", risk))

        if vision_results:
            modalities_used.append("vision")
            entities = vision_results.get("entities", [])
            for e in entities:
                e["source_modality"] = "vision"
            all_entities.extend(entities)
            risk = vision_results.get("risk_score", 0.0)
            all_risks.append(("vision", risk))

        if audio_results:
            modalities_used.append("audio")
            entities = audio_results.get("entities", [])
            for e in entities:
                e["source_modality"] = "audio"
            all_entities.extend(entities)
            risk = audio_results.get("risk_score", 0.0)
            all_risks.append(("audio", risk))

        merged_entities = self._deduplicate_entities(all_entities)

        correlations = self._find_correlations(all_entities)

        combined_risk = self._compute_combined_risk(all_risks)

        if len(modalities_used) > 1 and correlations:
            combined_risk = min(combined_risk * 1.2, 1.0)

        result = {
            "modalities_used": modalities_used,
            "total_entities": len(merged_entities),
            "entities": merged_entities,
            "correlations": correlations,
            "combined_risk_score": round(combined_risk, 4),
            "modality_risks": {m: r for m, r in all_risks},
            "cross_modal_confidence": self._compute_cross_modal_confidence(
                modalities_used, correlations
            ),
        }

        self.fusion_history.append(result)
        logger.info(
            "multimodal_fusion_complete",
            modalities=modalities_used,
            entities=len(merged_entities),
            correlations=len(correlations),
            risk=combined_risk,
        )

        return result

    def _deduplicate_entities(self, entities: list) -> list:
        seen = {}
        merged = []

        for entity in entities:
            label = entity.get("label", "").lower().strip()

            if label in seen:

                existing = seen[label]
                existing["risk_score"] = max(
                    existing.get("risk_score", 0),
                    entity.get("risk_score", 0),
                )
                existing_modalities = existing.get("modalities", [])
                new_modality = entity.get("source_modality", "unknown")
                if new_modality not in existing_modalities:
                    existing_modalities.append(new_modality)
                existing["modalities"] = existing_modalities

                existing_props = existing.get("properties", {})
                new_props = entity.get("properties", {})
                existing_props.update(new_props)
                existing["properties"] = existing_props
            else:
                entity["modalities"] = [entity.get("source_modality", "unknown")]
                seen[label] = entity
                merged.append(entity)

        return merged

    def _find_correlations(self, entities: list) -> list:
        correlations = []

        by_modality = {}
        for e in entities:
            modality = e.get("source_modality", "unknown")
            by_modality.setdefault(modality, []).append(e)

        modalities = list(by_modality.keys())

        for i in range(len(modalities)):
            for j in range(i + 1, len(modalities)):
                m1, m2 = modalities[i], modalities[j]
                labels1 = {e.get("label", "").lower() for e in by_modality[m1]}
                labels2 = {e.get("label", "").lower() for e in by_modality[m2]}

                shared = labels1 & labels2
                for label in shared:
                    if label:
                        correlations.append({
                            "entity": label,
                            "modalities": [m1, m2],
                            "type": "cross_modal_match",
                            "confidence": 0.8,
                        })

        return correlations

    def _compute_combined_risk(self, modality_risks: list) -> float:
        if not modality_risks:
            return 0.0

        weighted_sum = 0.0
        weight_total = 0.0

        for modality, risk in modality_risks:
            weight = self.MODALITY_WEIGHTS.get(modality, 0.2)
            weighted_sum += risk * weight
            weight_total += weight

        return weighted_sum / max(weight_total, 1e-6)

    def _compute_cross_modal_confidence(
        self, modalities: list, correlations: list
    ) -> float:
        modality_factor = len(modalities) / 3.0
        correlation_factor = min(len(correlations) / 5.0, 1.0)
        return round(min((modality_factor + correlation_factor) / 2.0, 1.0), 4)
