"""Pattern aggregate root for feedback pattern detection."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from src.domain.base import AggregateRoot
from src.domain.events import PatternDetectedEvent, PatternLearnedEvent
from src.domain.value_objects import (
    Embeddings,
    FeedbackCategory,
    FeedbackId,
    PatternId,
    Priority,
    Timestamp,
)


@dataclass
class Verdict:
    """Verdict for pattern learning."""

    success: bool
    confidence: float
    reasoning: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "success": self.success,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
        }


@dataclass
class Prediction:
    """Prediction for future issues."""

    likely_issue: str
    probability: float
    suggested_action: str
    severity: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "likely_issue": self.likely_issue,
            "probability": self.probability,
            "suggested_action": self.suggested_action,
            "severity": self.severity,
        }


@dataclass
class PatternDescription:
    """Description of detected pattern."""

    category: FeedbackCategory
    keywords: list[str]
    avg_sentiment_score: float

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "category": self.category.value,
            "keywords": self.keywords,
            "avg_sentiment_score": self.avg_sentiment_score,
        }


@dataclass
class FeedbackPattern(AggregateRoot):
    """Pattern aggregate root - detected feedback patterns."""

    # Identity
    pattern_id: PatternId = field(default_factory=PatternId.generate)

    # Pattern Definition
    pattern: PatternDescription | None = None
    frequency: int = 0
    severity: str = "low"

    # Related Data
    related_feedback: list[FeedbackId] = field(default_factory=list)
    embeddings: Embeddings | None = None

    # Learning
    verdicts: list[Verdict] = field(default_factory=list)
    predictions: list[Prediction] = field(default_factory=list)

    # Metadata
    detected_at: Timestamp = field(default_factory=Timestamp.now)

    @classmethod
    def detect(
        cls,
        feedback_cluster: list[Any],  # List of Feedback objects
        pattern_description: PatternDescription,
        severity: str = "medium",
    ) -> FeedbackPattern:
        """Factory method to detect a new pattern from feedback cluster."""
        pattern = cls(
            pattern_id=PatternId.generate(),
            pattern=pattern_description,
            frequency=len(feedback_cluster),
            severity=severity,
            related_feedback=[
                FeedbackId(fb.feedback_id.value) for fb in feedback_cluster
            ],
            detected_at=Timestamp.now(),
        )

        # Raise domain event
        pattern._add_event(
            PatternDetectedEvent(
                pattern_id=pattern.pattern_id.value,
                category=pattern_description.category.value,
                frequency=len(feedback_cluster),
                severity=severity,
            )
        )

        return pattern

    def learn(self, verdict: Verdict) -> None:
        """Learn from verdict feedback."""
        self.verdicts.append(verdict)
        self.updated_at = Timestamp.now().value

        self._add_event(
            PatternLearnedEvent(
                pattern_id=self.pattern_id.value,
                verdict_success=verdict.success,
                verdict_confidence=verdict.confidence,
            )
        )

    def add_prediction(self, prediction: Prediction) -> None:
        """Add a new prediction."""
        self.predictions.append(prediction)
        self.updated_at = Timestamp.now().value

    def increment_frequency(self) -> None:
        """Increment pattern frequency when new matching feedback appears."""
        self.frequency += 1
        self.updated_at = Timestamp.now().value

    def calculate_priority(self) -> Priority:
        """Calculate priority based on severity and frequency."""
        return Priority.from_severity(self.severity, self.frequency)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.pattern_id.value,
            "pattern": self.pattern.to_dict() if self.pattern else None,
            "frequency": self.frequency,
            "severity": self.severity,
            "priority": self.calculate_priority().value,
            "related_feedback": [f.value for f in self.related_feedback],
            "verdicts": [v.to_dict() for v in self.verdicts],
            "predictions": [p.to_dict() for p in self.predictions],
            "detected_at": self.detected_at.value.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
