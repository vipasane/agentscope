"""Domain value objects for feedback system."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any

from src.domain.base import DomainError, ValueObject, generate_anonymous_id


class FeedbackSource(str, Enum):
    """Source of feedback submission."""

    GITHUB = "github"
    NPM = "npm"
    DISCORD = "discord"
    IN_APP = "in-app"
    EMAIL = "email"


class FeedbackStatus(str, Enum):
    """Feedback processing status."""

    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    ARCHIVED = "archived"


class FeedbackCategory(str, Enum):
    """Feedback category classification."""

    BUG = "bug"
    FEATURE = "feature"
    PERFORMANCE = "performance"
    UX = "ux"
    DOCS = "docs"
    SECURITY = "security"
    API = "api"
    INTEGRATION = "integration"
    DEPLOYMENT = "deployment"
    OTHER = "other"


class SentimentLabel(str, Enum):
    """Sentiment classification labels."""

    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class ProcessingPurpose(str, Enum):
    """GDPR data processing purposes."""

    FEEDBACK_COLLECTION = "feedback-collection"
    ANALYTICS = "analytics"
    COMMUNICATION = "communication"


class Priority(int, Enum):
    """Issue priority levels."""

    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4

    @classmethod
    def from_severity(cls, severity: str, frequency: int) -> Priority:
        """Calculate priority from severity and frequency."""
        if severity == "critical" or frequency > 100:
            return cls.CRITICAL
        if severity == "high" or frequency > 50:
            return cls.HIGH
        if frequency > 10:
            return cls.MEDIUM
        return cls.LOW


@dataclass(frozen=True)
class FeedbackId(ValueObject[str]):
    """Feedback unique identifier."""

    @classmethod
    def generate(cls) -> FeedbackId:
        """Generate a new feedback ID."""
        from ulid import ULID

        return cls(str(ULID()))


@dataclass(frozen=True)
class AnonymousUserId(ValueObject[str]):
    """Anonymized user identifier (GDPR-compliant)."""

    @classmethod
    def from_raw(cls, raw_user_id: str) -> AnonymousUserId:
        """Create anonymous ID from raw user ID."""
        return cls(generate_anonymous_id(raw_user_id))


@dataclass(frozen=True)
class SanitizedContent(ValueObject[str]):
    """Sanitized feedback content (XSS-safe, no PII)."""

    MAX_LENGTH = 10000

    @classmethod
    def from_raw(cls, raw_content: str) -> SanitizedContent:
        """Create sanitized content from raw input."""
        # Validate length
        if len(raw_content) > cls.MAX_LENGTH:
            raise DomainError(f"Content exceeds maximum length of {cls.MAX_LENGTH}")

        # Strip HTML tags
        sanitized = re.sub(r"<[^>]+>", "", raw_content)

        # Remove scripts
        sanitized = re.sub(r"<script.*?</script>", "", sanitized, flags=re.DOTALL)

        # Basic PII detection patterns
        pii_patterns = [
            r"\b\d{3}-\d{2}-\d{4}\b",  # SSN
            r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",  # Credit card
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # Email
        ]

        for pattern in pii_patterns:
            sanitized = re.sub(pattern, "[REDACTED]", sanitized)

        return cls(sanitized.strip())


@dataclass(frozen=True)
class Sentiment(ValueObject[dict[str, Any]]):
    """Sentiment analysis result."""

    @classmethod
    def create(cls, label: SentimentLabel, score: float) -> Sentiment:
        """Create sentiment with validation."""
        if not 0 <= score <= 1:
            raise DomainError("Sentiment score must be between 0 and 1")

        return cls({"label": label.value, "score": score})

    @property
    def label(self) -> SentimentLabel:
        """Get sentiment label."""
        return SentimentLabel(self.value["label"])

    @property
    def score(self) -> float:
        """Get confidence score."""
        return self.value["score"]

    def is_positive(self) -> bool:
        """Check if sentiment is positive."""
        return self.label == SentimentLabel.POSITIVE

    def is_negative(self) -> bool:
        """Check if sentiment is negative."""
        return self.label == SentimentLabel.NEGATIVE


@dataclass(frozen=True)
class Embeddings(ValueObject[list[float]]):
    """Vector embeddings for semantic search."""

    DIMENSIONS = 768

    def __post_init__(self) -> None:
        """Validate embeddings dimensions."""
        if len(self.value) != self.DIMENSIONS:
            raise DomainError(f"Embeddings must have {self.DIMENSIONS} dimensions")

    def cosine_similarity(self, other: Embeddings) -> float:
        """Calculate cosine similarity with another embedding vector."""
        import numpy as np

        dot_product = np.dot(self.value, other.value)
        magnitude_a = np.linalg.norm(self.value)
        magnitude_b = np.linalg.norm(other.value)

        if magnitude_a == 0 or magnitude_b == 0:
            return 0.0

        return float(dot_product / (magnitude_a * magnitude_b))


@dataclass(frozen=True)
class PatternId(ValueObject[str]):
    """Pattern unique identifier."""

    @classmethod
    def generate(cls) -> PatternId:
        """Generate a new pattern ID."""
        from ulid import ULID

        return cls(str(ULID()))


@dataclass(frozen=True)
class Timestamp(ValueObject[datetime]):
    """Timestamp value object."""

    @classmethod
    def now(cls) -> Timestamp:
        """Create timestamp for current time."""
        return cls(datetime.utcnow())

    def is_expired(self, max_age_seconds: int) -> bool:
        """Check if timestamp has expired."""
        now = datetime.utcnow()
        age = (now - self.value).total_seconds()
        return age > max_age_seconds


@dataclass(frozen=True)
class FeedbackMetadata(ValueObject[dict[str, Any]]):
    """Metadata associated with feedback."""

    @classmethod
    def create(
        cls,
        version: str | None = None,
        platform: str | None = None,
        user_agent: str | None = None,
        **extra: Any,
    ) -> FeedbackMetadata:
        """Create metadata with common fields."""
        data: dict[str, Any] = {}

        if version:
            data["version"] = version
        if platform:
            data["platform"] = platform
        if user_agent:
            data["user_agent"] = user_agent

        data.update(extra)
        return cls(data)
