"""Tests for Feedback aggregate."""

import pytest

from src.domain.base import DomainError
from src.domain.feedback import Feedback
from src.domain.value_objects import (
    Embeddings,
    FeedbackCategory,
    FeedbackSource,
    PatternId,
    Sentiment,
    SentimentLabel,
)


def test_create_feedback():
    """Test creating feedback aggregate."""
    feedback = Feedback.create(
        raw_content="This is a test feedback",
        source=FeedbackSource.GITHUB,
        raw_user_id="user123",
    )

    assert feedback.content is not None
    assert feedback.content.value == "This is a test feedback"
    assert feedback.source == FeedbackSource.GITHUB
    assert feedback.submitter is not None

    # Check domain event was raised
    events = feedback.get_uncommitted_events()
    assert len(events) == 1
    assert events[0].event_type == "FeedbackSubmitted"


def test_categorize_feedback():
    """Test categorizing feedback."""
    feedback = Feedback.create(
        raw_content="Found a bug in the API",
        source=FeedbackSource.IN_APP,
    )

    feedback.categorize(FeedbackCategory.BUG, confidence=0.95)

    assert feedback.category == FeedbackCategory.BUG

    # Check event
    events = feedback.get_uncommitted_events()
    assert any(e.event_type == "FeedbackCategorized" for e in events)


def test_analyze_sentiment():
    """Test analyzing sentiment."""
    feedback = Feedback.create(
        raw_content="Great feature!",
        source=FeedbackSource.IN_APP,
    )

    sentiment = Sentiment.create(SentimentLabel.POSITIVE, 0.95)
    feedback.analyze_sentiment(sentiment)

    assert feedback.sentiment is not None
    assert feedback.sentiment.is_positive()
    assert feedback.sentiment.score == 0.95


def test_set_embeddings():
    """Test setting embeddings."""
    feedback = Feedback.create(
        raw_content="Test content",
        source=FeedbackSource.IN_APP,
    )

    embeddings = Embeddings([0.1] * 768)
    feedback.set_embeddings(embeddings)

    assert feedback.embeddings == embeddings


def test_link_to_pattern():
    """Test linking feedback to pattern."""
    feedback = Feedback.create(
        raw_content="Test content",
        source=FeedbackSource.IN_APP,
    )

    pattern_id = PatternId.generate()
    feedback.link_to_pattern(pattern_id)

    assert pattern_id in feedback.related_patterns

    # Check event
    events = feedback.get_uncommitted_events()
    assert any(e.event_type == "FeedbackLinkedToPattern" for e in events)


def test_mark_as_processed():
    """Test marking feedback as processed."""
    feedback = Feedback.create(
        raw_content="Test content",
        source=FeedbackSource.IN_APP,
    )

    feedback.mark_as_processed()

    assert feedback.status.value == "processed"

    # Cannot modify after processing
    with pytest.raises(DomainError):
        feedback.categorize(FeedbackCategory.BUG)


def test_sanitize_content():
    """Test content sanitization."""
    malicious_content = "<script>alert('xss')</script>Hello"

    feedback = Feedback.create(
        raw_content=malicious_content,
        source=FeedbackSource.IN_APP,
    )

    # Scripts should be removed
    assert "<script>" not in feedback.content.value
    assert "Hello" in feedback.content.value


def test_max_content_length():
    """Test maximum content length validation."""
    long_content = "a" * 10001  # Exceeds max length

    with pytest.raises(DomainError):
        Feedback.create(
            raw_content=long_content,
            source=FeedbackSource.IN_APP,
        )


def test_to_dict():
    """Test serialization to dictionary."""
    feedback = Feedback.create(
        raw_content="Test content",
        source=FeedbackSource.GITHUB,
        raw_user_id="user123",
    )

    data = feedback.to_dict()

    assert data["id"] == feedback.feedback_id.value
    assert data["content"] == "Test content"
    assert data["source"] == "github"
