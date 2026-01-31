"""Feedback aggregate root."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from src.domain.base import AggregateRoot, DomainError
from src.domain.events import (
    FeedbackCategorizedEvent,
    FeedbackLinkedToPatternEvent,
    FeedbackProcessedEvent,
    FeedbackSubmittedEvent,
    SentimentAnalyzedEvent,
)
from src.domain.value_objects import (
    AnonymousUserId,
    Embeddings,
    FeedbackCategory,
    FeedbackId,
    FeedbackMetadata,
    FeedbackSource,
    FeedbackStatus,
    PatternId,
    SanitizedContent,
    Sentiment,
    Timestamp,
)


@dataclass
class Feedback(AggregateRoot):
    """Feedback aggregate root - represents user feedback submission."""

    # Identity
    feedback_id: FeedbackId = field(default_factory=FeedbackId.generate)

    # Value Objects
    content: SanitizedContent | None = None
    category: FeedbackCategory | None = None
    sentiment: Sentiment | None = None

    # Metadata
    submitted_at: Timestamp = field(default_factory=Timestamp.now)
    source: FeedbackSource = FeedbackSource.IN_APP
    submitter: AnonymousUserId | None = None
    metadata: FeedbackMetadata = field(default_factory=lambda: FeedbackMetadata({}))

    # State
    status: FeedbackStatus = FeedbackStatus.PENDING
    embeddings: Embeddings | None = None
    related_patterns: list[PatternId] = field(default_factory=list)

    @classmethod
    def create(
        cls,
        raw_content: str,
        source: FeedbackSource,
        raw_user_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Feedback:
        """Factory method to create new feedback."""
        # Sanitize content
        content = SanitizedContent.from_raw(raw_content)

        # Create anonymous user ID if provided
        submitter = AnonymousUserId.from_raw(raw_user_id) if raw_user_id else None

        # Create metadata
        feedback_metadata = FeedbackMetadata(metadata or {})

        # Create feedback
        feedback = cls(
            feedback_id=FeedbackId.generate(),
            content=content,
            source=source,
            submitter=submitter,
            metadata=feedback_metadata,
            submitted_at=Timestamp.now(),
            status=FeedbackStatus.PENDING,
        )

        # Raise domain event
        feedback._add_event(
            FeedbackSubmittedEvent(
                feedback_id=feedback.feedback_id.value,
                content=content.value,
                source=source.value,
            )
        )

        return feedback

    def categorize(self, category: FeedbackCategory, confidence: float = 1.0) -> None:
        """Categorize the feedback."""
        self._ensure_not_processed()

        self.category = category
        self.updated_at = Timestamp.now().value

        self._add_event(
            FeedbackCategorizedEvent(
                feedback_id=self.feedback_id.value,
                category=category.value,
                confidence=confidence,
            )
        )

    def analyze_sentiment(self, sentiment: Sentiment) -> None:
        """Analyze sentiment of the feedback."""
        self.sentiment = sentiment
        self.updated_at = Timestamp.now().value

        self._add_event(
            SentimentAnalyzedEvent(
                feedback_id=self.feedback_id.value,
                sentiment_label=sentiment.label.value,
                sentiment_score=sentiment.score,
            )
        )

    def set_embeddings(self, embeddings: Embeddings) -> None:
        """Set vector embeddings for semantic search."""
        self.embeddings = embeddings
        self.updated_at = Timestamp.now().value

    def link_to_pattern(self, pattern_id: PatternId) -> None:
        """Link feedback to a detected pattern."""
        if pattern_id not in self.related_patterns:
            self.related_patterns.append(pattern_id)
            self.updated_at = Timestamp.now().value

            self._add_event(
                FeedbackLinkedToPatternEvent(
                    feedback_id=self.feedback_id.value,
                    pattern_id=pattern_id.value,
                )
            )

    def mark_as_processed(self) -> None:
        """Mark feedback as fully processed."""
        self._ensure_not_processed()

        self.status = FeedbackStatus.PROCESSED
        self.updated_at = Timestamp.now().value

        self._add_event(
            FeedbackProcessedEvent(
                feedback_id=self.feedback_id.value,
            )
        )

    def archive(self) -> None:
        """Archive old feedback."""
        self.status = FeedbackStatus.ARCHIVED
        self.updated_at = Timestamp.now().value

    def _ensure_not_processed(self) -> None:
        """Invariant: Cannot modify processed feedback."""
        if self.status == FeedbackStatus.PROCESSED:
            raise DomainError("Cannot modify processed feedback")

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.feedback_id.value,
            "content": self.content.value if self.content else None,
            "category": self.category.value if self.category else None,
            "sentiment": self.sentiment.value if self.sentiment else None,
            "source": self.source.value,
            "submitter": self.submitter.value if self.submitter else None,
            "metadata": self.metadata.value,
            "status": self.status.value,
            "submitted_at": self.submitted_at.value.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "related_patterns": [p.value for p in self.related_patterns],
        }
