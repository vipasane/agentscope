"""API configuration and settings."""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API
    api_title: str = "Alpha Feedback System API"
    api_version: str = "1.0.0"
    api_description: str = "GDPR-compliant feedback collection with RuVector intelligence"

    # GitHub
    github_token: Optional[str] = None
    github_owner: str = "ruvnet"
    github_webhook_secret: Optional[str] = None

    # Analytics
    sentiment_model: str = "distilbert-base-uncased-finetuned-sst-2-english"
    classifier_model: str = "facebook/bart-large-mnli"
    embeddings_model: str = "sentence-transformers/all-mpnet-base-v2"

    # Vector Store
    vector_store_path: str = "./data/vector_store"
    hnsw_m: int = 16
    hnsw_ef_construction: int = 200
    hnsw_ef_search: int = 50

    # Rate Limiting
    rate_limit_per_minute: int = 100
    rate_limit_global: int = 1000

    # GDPR
    consent_retention_days: int = 730  # 24 months
    data_deletion_grace_days: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
