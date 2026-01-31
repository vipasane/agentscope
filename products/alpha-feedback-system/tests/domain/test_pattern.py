"""Tests for FeedbackPattern aggregate."""

import pytest

from src.domain.feedback import Feedback
from src.domain.pattern import FeedbackPattern, PatternDescription, Verdict
from src.domain.value_objects import FeedbackCategory, FeedbackSource


def test_detect_pattern():
    """Test detecting pattern from feedback cluster."""
    # Create feedback cluster
    feedback_cluster = [
        Feedback.create(
            raw_content="Bug in API endpoint",
            source=FeedbackSource.GITHUB,
        )
        for _ in range(5)
    ]

    # Categorize all as bugs
    for fb in feedback_cluster:
        fb.categorize(FeedbackCategory.BUG)

    # Create pattern description
    pattern_desc = PatternDescription(
        category=FeedbackCategory.BUG,
        keywords=["api", "endpoint", "bug"],
        avg_sentiment_score=0.3,
    )

    # Detect pattern
    pattern = FeedbackPattern.detect(
        feedback_cluster,
        pattern_desc,
        severity="high",
    )

    assert pattern.frequency == 5
    assert pattern.severity == "high"
    assert len(pattern.related_feedback) == 5

    # Check event
    events = pattern.get_uncommitted_events()
    assert any(e.event_type == "PatternDetected" for e in events)


def test_learn_from_verdict():
    """Test learning from verdict."""
    feedback_cluster = [
        Feedback.create(raw_content="Test", source=FeedbackSource.IN_APP)
    ]

    pattern_desc = PatternDescription(
        category=FeedbackCategory.BUG,
        keywords=["test"],
        avg_sentiment_score=0.5,
    )

    pattern = FeedbackPattern.detect(feedback_cluster, pattern_desc)

    # Learn from verdict
    verdict = Verdict(
        success=True,
        confidence=0.9,
        reasoning="Issue was resolved successfully",
    )

    pattern.learn(verdict)

    assert len(pattern.verdicts) == 1
    assert pattern.verdicts[0].success is True

    # Check event
    events = pattern.get_uncommitted_events()
    assert any(e.event_type == "PatternLearned" for e in events)


def test_calculate_priority():
    """Test priority calculation."""
    feedback_cluster = [
        Feedback.create(raw_content="Critical bug", source=FeedbackSource.GITHUB)
        for _ in range(150)
    ]

    pattern_desc = PatternDescription(
        category=FeedbackCategory.SECURITY,
        keywords=["critical", "security"],
        avg_sentiment_score=0.1,
    )

    pattern = FeedbackPattern.detect(
        feedback_cluster,
        pattern_desc,
        severity="critical",
    )

    priority = pattern.calculate_priority()

    # Critical + high frequency should be CRITICAL priority
    assert priority.value == 1  # CRITICAL
