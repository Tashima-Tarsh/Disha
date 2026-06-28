from __future__ import annotations


def route_version(input_text: str, source_type: str = "operator") -> str:
    normalized = f"{source_type} {input_text}".lower()
    text_only = input_text.lower()
    if any(
        token in normalized
        for token in (
            "climate",
            "infrastructure",
            "resource",
            "bridge",
            "flood",
            "development",
        )
    ):
        return "2.6"
    if any(
        token in text_only
        for token in ("edge", "device", "iot", "physical interface", "machine state")
    ):
        return "3.6"
    if any(
        token in normalized
        for token in ("health", "welfare", "education", "school", "district service")
    ):
        return "4.6"
    if any(
        token in text_only
        for token in ("gap", "mitigation", "corrective", "vyuha", "yudh")
    ):
        return "6.6"
    if any(
        token in normalized
        for token in ("coordinate", "geospatial", "gps", "sensor", "object tracking")
    ):
        return "1.6"
    if any(
        token in normalized
        for token in (
            "rti",
            "constitution",
            "article",
            "open data",
            "audit",
            "public authority",
        )
    ):
        return "5.6"
    return "5.6"
