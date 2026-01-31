"""Repository interfaces (ports)."""

from abc import ABC, abstractmethod
from typing import Optional

from src.domain.consent import ConsentRecord
from src.domain.feedback import Feedback
from src.domain.pattern import FeedbackPattern
from src.domain.value_objects import (
    AnonymousUserId,
    Embeddings,
    FeedbackCategory,
    FeedbackId,
    FeedbackSource,
    PatternId,
)


class FeedbackRepository(ABC):
    """Repository interface for Feedback aggregate."""

    @abstractmethod
    async def save(self, feedback: Feedback) -> None:
        """Save feedback aggregate."""
        pass

    @abstractmethod
    async def find_by_id(self, feedback_id: FeedbackId) -> Optional[Feedback]:
        """Find feedback by ID."""
        pass

    @abstractmethod
    async def find_by_source(
        self, source: FeedbackSource, limit: int = 100
    ) -> list[Feedback]:
        """Find feedback by source."""
        pass

    @abstractmethod
    async def find_similar(
        self, embeddings: Embeddings, limit: int = 10
    ) -> list[Feedback]:
        """Find similar feedback using vector search."""
        pass

    @abstractmethod
    async def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        category: Optional[FeedbackCategory] = None,
    ) -> list[Feedback]:
        """List all feedback with pagination and filters."""
        pass


class PatternRepository(ABC):
    """Repository interface for FeedbackPattern aggregate."""

    @abstractmethod
    async def save(self, pattern: FeedbackPattern) -> None:
        """Save pattern aggregate."""
        pass

    @abstractmethod
    async def find_by_id(self, pattern_id: PatternId) -> Optional[FeedbackPattern]:
        """Find pattern by ID."""
        pass

    @abstractmethod
    async def find_by_category(
        self, category: FeedbackCategory
    ) -> list[FeedbackPattern]:
        """Find patterns by category."""
        pass

    @abstractmethod
    async def find_active(self, min_frequency: int = 3) -> list[FeedbackPattern]:
        """Find active patterns with minimum frequency."""
        pass

    @abstractmethod
    async def list_all(self, skip: int = 0, limit: int = 100) -> list[FeedbackPattern]:
        """List all patterns with pagination."""
        pass


class ConsentRepository(ABC):
    """Repository interface for ConsentRecord aggregate."""

    @abstractmethod
    async def save(self, consent: ConsentRecord) -> None:
        """Save consent record."""
        pass

    @abstractmethod
    async def find_by_user_id(
        self, user_id: AnonymousUserId
    ) -> Optional[ConsentRecord]:
        """Find consent record by user ID."""
        pass

    @abstractmethod
    async def delete_by_user_id(self, user_id: AnonymousUserId) -> None:
        """Delete consent record (GDPR right to erasure)."""
        pass
