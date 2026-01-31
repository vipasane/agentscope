"""Base classes for domain-driven design."""

from __future__ import annotations

import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Generic, TypeVar
from uuid import uuid4


T = TypeVar("T")


@dataclass(frozen=True)
class ValueObject(Generic[T], ABC):
    """Base class for value objects (immutable)."""

    value: T

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, self.__class__):
            return False
        return self.value == other.value

    def __hash__(self) -> int:
        return hash(self.value)

    def __str__(self) -> str:
        return str(self.value)


@dataclass
class DomainEvent(ABC):
    """Base class for domain events."""

    event_id: str = field(default_factory=lambda: str(uuid4()))
    occurred_at: datetime = field(default_factory=datetime.utcnow)
    aggregate_id: str = ""
    version: int = 1

    @property
    @abstractmethod
    def event_type(self) -> str:
        """Event type identifier."""
        pass


@dataclass
class Entity(ABC):
    """Base class for entities (identity-based equality)."""

    id: str = field(default_factory=lambda: str(uuid4()))
    version: int = 1
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, self.__class__):
            return False
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)


class AggregateRoot(Entity):
    """Base class for aggregate roots."""

    def __init__(self, **kwargs: Any):
        super().__init__(**kwargs)
        self._uncommitted_events: list[DomainEvent] = []

    def _add_event(self, event: DomainEvent) -> None:
        """Add a domain event to the uncommitted events list."""
        event.aggregate_id = self.id
        event.version = self.version
        self._uncommitted_events.append(event)

    def get_uncommitted_events(self) -> list[DomainEvent]:
        """Get all uncommitted domain events."""
        return list(self._uncommitted_events)

    def clear_events(self) -> None:
        """Clear uncommitted events after they are persisted."""
        self._uncommitted_events.clear()


class DomainError(Exception):
    """Base exception for domain errors."""

    pass


def generate_anonymous_id(raw_user_id: str, salt: str = "") -> str:
    """Generate anonymous user ID using SHA-256 hash."""
    combined = f"{raw_user_id}{salt}"
    return hashlib.sha256(combined.encode()).hexdigest()
