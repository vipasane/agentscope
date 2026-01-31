"""Domain events for feedback system."""

from dataclasses import dataclass

from src.domain.base import DomainEvent
from src.domain.value_objects import (
    FeedbackCategory,
    FeedbackId,
    PatternId,
    Sentiment,
)


@dataclass
class FeedbackSubmittedEvent(DomainEvent):
    """Raised when new feedback is submitted."""

    feedback_id: str
    content: str
    source: str

    @property
    def event_type(self) -> str:
        return "FeedbackSubmitted"


@dataclass
class FeedbackCategorizedEvent(DomainEvent):
    """Raised when feedback is categorized."""

    feedback_id: str
    category: str
    confidence: float

    @property
    def event_type(self) -> str:
        return "FeedbackCategorized"


@dataclass
class SentimentAnalyzedEvent(DomainEvent):
    """Raised when sentiment analysis is complete."""

    feedback_id: str
    sentiment_label: str
    sentiment_score: float

    @property
    def event_type(self) -> str:
        return "SentimentAnalyzed"


@dataclass
class FeedbackLinkedToPatternEvent(DomainEvent):
    """Raised when feedback is linked to a pattern."""

    feedback_id: str
    pattern_id: str

    @property
    def event_type(self) -> str:
        return "FeedbackLinkedToPattern"


@dataclass
class FeedbackProcessedEvent(DomainEvent):
    """Raised when feedback processing is complete."""

    feedback_id: str

    @property
    def event_type(self) -> str:
        return "FeedbackProcessed"


@dataclass
class PatternDetectedEvent(DomainEvent):
    """Raised when a new pattern is detected."""

    pattern_id: str
    category: str
    frequency: int
    severity: str

    @property
    def event_type(self) -> str:
        return "PatternDetected"


@dataclass
class PatternLearnedEvent(DomainEvent):
    """Raised when a pattern is learned from verdict."""

    pattern_id: str
    verdict_success: bool
    verdict_confidence: float

    @property
    def event_type(self) -> str:
        return "PatternLearned"


@dataclass
class ConsentGivenEvent(DomainEvent):
    """Raised when user gives consent."""

    user_id: str
    purpose: str

    @property
    def event_type(self) -> str:
        return "ConsentGiven"


@dataclass
class ConsentRevokedEvent(DomainEvent):
    """Raised when user revokes consent."""

    user_id: str
    purpose: str

    @property
    def event_type(self) -> str:
        return "ConsentRevoked"


@dataclass
class DataExportRequestedEvent(DomainEvent):
    """Raised when user requests data export."""

    user_id: str

    @property
    def event_type(self) -> str:
        return "DataExportRequested"


@dataclass
class DataDeletionRequestedEvent(DomainEvent):
    """Raised when user requests data deletion."""

    user_id: str

    @property
    def event_type(self) -> str:
        return "DataDeletionRequested"
