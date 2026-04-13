"""Application configuration using environment variables."""

import secrets
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "AI Intelligence Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # Auth
    # REQUIRED in production. A random 32-byte hex default is generated for dev
    # only — it is NOT persisted across restarts, so all tokens invalidate on
    # restart unless SECRET_KEY is set explicitly via environment.
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database
    POSTGRES_URL: str = ""
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = ""
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8000

    # External APIs
    OPENAI_API_KEY: str = ""
    SHODAN_API_KEY: str = ""
    ETHERSCAN_API_KEY: str = ""
    ALCHEMY_API_KEY: str = ""
    SPIDERFOOT_API_KEY: str = ""

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TOPIC_EVENTS: str = "intelligence-events"
    KAFKA_TOPIC_ALERTS: str = "intelligence-alerts"

    # LLM
    LLM_MODEL: str = "gpt-4"
    LLM_TEMPERATURE: float = 0.1

    # CORS — comma-separated list of allowed origins
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def _require_secret_key(cls, v: str) -> str:
        """Fall back to a random key in non-production; raise in production."""
        if not v:
            import os
            if os.getenv("APP_ENV", "development").lower() == "production":
                raise ValueError(
                    "SECRET_KEY must be set in production. "
                    "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
                )
            # Dev/test: generate a random key so JWT signing works but tokens
            # don't survive restarts (acceptable for local development).
            return secrets.token_hex(32)
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long.")
        return v

    def get_cors_origins(self) -> list[str]:
        """Parse CORS_ORIGINS into a list."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
