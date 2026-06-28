from __future__ import annotations

from hashlib import sha256

from .models import ConfidenceLevel, EvidenceBundle, EvidenceClass, EvidenceItem

CLASS_PRIORITY: dict[EvidenceClass, int] = {
    EvidenceClass.verified: 100,
    EvidenceClass.official_record: 95,
    EvidenceClass.rti_record: 90,
    EvidenceClass.audit_record: 85,
    EvidenceClass.constitutional_reference: 80,
    EvidenceClass.open_data: 70,
    EvidenceClass.sensor_signal: 65,
    EvidenceClass.contradiction: 45,
    EvidenceClass.inference: 35,
    EvidenceClass.allegation: 25,
    EvidenceClass.unresolved: 10,
}


def classify_evidence_text(text: str, source_type: str = "operator") -> EvidenceClass:
    normalized = f"{source_type} {text}".lower()
    if any(
        token in normalized
        for token in (
            "gazette",
            "official order",
            "government notification",
            ".gov",
            "gov.in",
        )
    ):
        return EvidenceClass.official_record
    if "rti" in normalized or "right to information" in normalized:
        return EvidenceClass.rti_record
    if any(
        token in normalized for token in ("open data", "data.gov", "csv", "dataset")
    ):
        return EvidenceClass.open_data
    if any(
        token in normalized
        for token in ("sensor", "telemetry", "iot", "gps", "coordinate")
    ):
        return EvidenceClass.sensor_signal
    if any(token in normalized for token in ("audit", "cag", "inspection report")):
        return EvidenceClass.audit_record
    if any(token in normalized for token in ("constitution", "article ", "schedule ")):
        return EvidenceClass.constitutional_reference
    if any(
        token in normalized for token in ("contradicts", "conflicts with", "mismatch")
    ):
        return EvidenceClass.contradiction
    if any(
        token in normalized
        for token in ("alleges", "allegation", "claimed", "unverified")
    ):
        return EvidenceClass.allegation
    if any(
        token in normalized
        for token in ("infer", "likely", "may indicate", "pattern suggests")
    ):
        return EvidenceClass.inference
    return EvidenceClass.unresolved


def confidence_for(evidence_class: EvidenceClass) -> ConfidenceLevel:
    if CLASS_PRIORITY[evidence_class] >= 85:
        return ConfidenceLevel.high
    if CLASS_PRIORITY[evidence_class] >= 55:
        return ConfidenceLevel.medium
    return ConfidenceLevel.low


def build_evidence_bundle(
    texts: list[str],
    source_type: str = "operator",
    source_links: list[str] | None = None,
) -> EvidenceBundle:
    links = source_links or []
    items: list[EvidenceItem] = []
    for index, text in enumerate(texts):
        evidence_class = classify_evidence_text(text, source_type)
        items.append(
            EvidenceItem(
                id=sha256(f"{source_type}:{index}:{text}".encode()).hexdigest()[:16],
                text=text,
                evidence_class=evidence_class,
                source_type=source_type,
                source_link=links[index] if index < len(links) else None,
                confidence=confidence_for(evidence_class),
            )
        )
    dominant = max(
        (item.evidence_class for item in items),
        key=lambda cls: CLASS_PRIORITY[cls],
        default=EvidenceClass.unresolved,
    )
    return EvidenceBundle(
        items=items,
        dominant_class=dominant,
        source_links=[link for link in links if link],
        confidence=confidence_for(dominant),
    )
