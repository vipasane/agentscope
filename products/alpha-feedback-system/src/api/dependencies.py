"""FastAPI dependencies for dependency injection."""

from functools import lru_cache
from pathlib import Path

from src.analytics.classifier import CategoryClassifier
from src.analytics.embeddings import EmbeddingsGenerator
from src.analytics.pattern_detector import PatternDetector
from src.analytics.sentiment import SentimentAnalyzer
from src.api.config import Settings, get_settings
from src.infrastructure.repositories import (
    InMemoryConsentRepository,
    InMemoryFeedbackRepository,
    InMemoryPatternRepository,
)
from src.infrastructure.vector_store import HNSWVectorStore


@lru_cache()
def get_vector_store(settings: Settings = get_settings()) -> HNSWVectorStore:
    """Get or create HNSW vector store."""
    vector_path = Path(settings.vector_store_path)
    vector_path.mkdir(parents=True, exist_ok=True)

    index_file = vector_path / "index.hnsw"
    metadata_file = vector_path / "metadata.pkl"

    if index_file.exists() and metadata_file.exists():
        return HNSWVectorStore.load(index_file, metadata_file)

    return HNSWVectorStore(
        dimensions=768,
        max_elements=100000,
        M=settings.hnsw_m,
        ef_construction=settings.hnsw_ef_construction,
        ef_search=settings.hnsw_ef_search,
    )


@lru_cache()
def get_feedback_repository(
    vector_store: HNSWVectorStore = get_vector_store(),
) -> InMemoryFeedbackRepository:
    """Get feedback repository."""
    return InMemoryFeedbackRepository(vector_store)


@lru_cache()
def get_pattern_repository() -> InMemoryPatternRepository:
    """Get pattern repository."""
    return InMemoryPatternRepository()


@lru_cache()
def get_consent_repository() -> InMemoryConsentRepository:
    """Get consent repository."""
    return InMemoryConsentRepository()


@lru_cache()
def get_sentiment_analyzer(settings: Settings = get_settings()) -> SentimentAnalyzer:
    """Get sentiment analyzer."""
    return SentimentAnalyzer(model_name=settings.sentiment_model)


@lru_cache()
def get_category_classifier(
    settings: Settings = get_settings(),
) -> CategoryClassifier:
    """Get category classifier."""
    return CategoryClassifier(model_name=settings.classifier_model)


@lru_cache()
def get_embeddings_generator(
    settings: Settings = get_settings(),
) -> EmbeddingsGenerator:
    """Get embeddings generator."""
    return EmbeddingsGenerator(model_name=settings.embeddings_model)


@lru_cache()
def get_pattern_detector(
    vector_store: HNSWVectorStore = get_vector_store(),
) -> PatternDetector:
    """Get pattern detector."""
    return PatternDetector(vector_store)
