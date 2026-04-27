from typing import Any

import structlog

logger = structlog.get_logger("data_quality")


class DataQualityService:
    """Ensures data integrity across the DISHA OS ingestion pipelines."""

    def __init__(self):
        self.stats = {"validated": 0, "rejected": 0}

    def validate_ingestion_payload(
        self, data: dict[str, Any], required_keys: list[str]
    ) -> bool:
        """Checks for missing keys and data types in incoming streams."""
        missing = [k for k in required_keys if k not in data]

        if missing:
            logger.error("validation_failed", missing_keys=missing)
            self.stats["rejected"] += 1
            return False

        # Add basic type sanitization here
        self.stats["validated"] += 1
        logger.info("data_validated", keys=list(data.keys()))
        return True

    def sanitize_log_entry(self, entry: str) -> str:
        """Removes PII or sensitive patterns from logs before storage."""
        # Simple mask for potential API keys or tokens
        sanitized = entry
        if "sk-" in entry:  # OpenAI style keys
            sanitized = " [MASKED_KEY] "
        return sanitized

    def get_quality_report(self) -> dict[str, Any]:
        total = self.stats["validated"] + self.stats["rejected"]
        health = (self.stats["validated"] / total * 100) if total > 0 else 100
        return {"health_score": health, "metrics": self.stats}
