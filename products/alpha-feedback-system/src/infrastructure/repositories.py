"""In-memory repository implementations (can be replaced with PostgreSQL/MongoDB)."""

from typing import Optional

from src.domain.consent import ConsentRecord
from src.domain.feedback import Feedback
from src.domain.pattern import FeedbackPattern
from src.domain.repositories import (
    ConsentRepository,
    FeedbackRepository,
    PatternRepository,
)
from src.domain.value_objects import (
    AnonymousUserId,
    Embeddings,
    FeedbackCategory,
    FeedbackId,
    FeedbackSource,
    PatternId,
)
from src.infrastructure.vector_store import HNSWVectorStore


class InMemoryFeedbackRepository(FeedbackRepository):
    """In-memory implementation of FeedbackRepository."""

    def __init__(self, vector_store: HNSWVectorStore):
        self.store: dict[str, Feedback] = {}
        self.vector_store = vector_store

    async def save(self, feedback: Feedback) -> None:
        """Save feedback aggregate."""
        self.store[feedback.feedback_id.value] = feedback

        # Add to vector store if embeddings exist
        if feedback.embeddings:
            self.vector_store.add(feedback.feedback_id.value, feedback.embeddings)

    async def find_by_id(self, feedback_id: FeedbackId) -> Optional[Feedback]:
        """Find feedback by ID."""
        return self.store.get(feedback_id.value)

    async def find_by_source(
        self, source: FeedbackSource, limit: int = 100
    ) -> list[Feedback]:
        """Find feedback by source."""
        results = [fb for fb in self.store.values() if fb.source == source]
        return results[:limit]

    async def find_similar(
        self, embeddings: Embeddings, limit: int = 10
    ) -> list[Feedback]:
        """Find similar feedback using vector search."""
        search_results = self.vector_store.search(embeddings, k=limit)

        similar_feedback = []
        for feedback_id, distance in search_results:
            feedback = self.store.get(feedback_id)
            if feedback:
                similar_feedback.append(feedback)

        return similar_feedback

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        category: Optional[FeedbackCategory] = None,
    ) -> list[Feedback]:
        """List all feedback with pagination and filters."""
        feedback_list = list(self.store.values())

        if category:
            feedback_list = [fb for fb in feedback_list if fb.category == category]

        # Sort by submitted_at descending
        feedback_list.sort(key=lambda fb: fb.submitted_at.value, reverse=True)

        return feedback_list[skip : skip + limit]


class InMemoryPatternRepository(PatternRepository):
    """In-memory implementation of PatternRepository."""

    def __init__(self):
        self.store: dict[str, FeedbackPattern] = {}

    async def save(self, pattern: FeedbackPattern) -> None:
        """Save pattern aggregate."""
        self.store[pattern.pattern_id.value] = pattern

    async def find_by_id(self, pattern_id: PatternId) -> Optional[FeedbackPattern]:
        """Find pattern by ID."""
        return self.store.get(pattern_id.value)

    async def find_by_category(
        self, category: FeedbackCategory
    ) -> list[FeedbackPattern]:
        """Find patterns by category."""
        return [
            pattern
            for pattern in self.store.values()
            if pattern.pattern and pattern.pattern.category == category
        ]

    async def find_active(self, min_frequency: int = 3) -> list[FeedbackPattern]:
        """Find active patterns with minimum frequency."""
        patterns = [
            pattern for pattern in self.store.values() if pattern.frequency >= min_frequency
        ]

        # Sort by priority (frequency * severity)
        patterns.sort(
            key=lambda p: p.calculate_priority().value * p.frequency, reverse=True
        )

        return patterns

    async def list_all(self, skip: int = 0, limit: int = 100) -> list[FeedbackPattern]:
        """List all patterns with pagination."""
        patterns = list(self.store.values())

        # Sort by frequency descending
        patterns.sort(key=lambda p: p.frequency, reverse=True)

        return patterns[skip : skip + limit]


class InMemoryConsentRepository(ConsentRepository):
    """In-memory implementation of ConsentRepository."""

    def __init__(self):
        self.store: dict[str, ConsentRecord] = {}

    async def save(self, consent: ConsentRecord) -> None:
        """Save consent record."""
        if consent.user_id:
            self.store[consent.user_id.value] = consent

    async def find_by_user_id(
        self, user_id: AnonymousUserId
    ) -> Optional[ConsentRecord]:
        """Find consent record by user ID."""
        return self.store.get(user_id.value)

    async def delete_by_user_id(self, user_id: AnonymousUserId) -> None:
        """Delete consent record (GDPR right to erasure)."""
        if user_id.value in self.store:
            del self.store[user_id.value]
