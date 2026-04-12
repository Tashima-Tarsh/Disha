"""Application configuration using environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "AI Intelligence Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # Auth
    SECRET_KEY: str = ""  # REQUIRED: set via SECRET_KEY env var in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database
    POSTGRES_URL: str = ""  # REQUIRED: set via POSTGRES_URL env var
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = ""  # REQUIRED: set via NEO4J_PASSWORD env var
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

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
