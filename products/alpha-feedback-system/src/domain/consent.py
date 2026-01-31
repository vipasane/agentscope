"""Consent aggregate root for GDPR compliance."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from src.domain.base import AggregateRoot
from src.domain.events import ConsentGivenEvent, ConsentRevokedEvent
from src.domain.value_objects import AnonymousUserId, ProcessingPurpose, Timestamp


@dataclass
class ConsentGiven:
    """Record of consent given for a specific purpose."""

    purpose: ProcessingPurpose
    given_at: datetime
    expires_at: datetime
    method: str = "explicit-opt-in"

    def is_expired(self) -> bool:
        """Check if consent has expired."""
        return datetime.utcnow() > self.expires_at

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "purpose": self.purpose.value,
            "given_at": self.given_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "method": self.method,
        }


@dataclass
class ConsentRecord(AggregateRoot):
    """Consent aggregate root - manages user consent for data processing."""

    # Identity
    user_id: AnonymousUserId | None = None

    # Consents
    consents: dict[ProcessingPurpose, ConsentGiven] = field(default_factory=dict)

    # Metadata
    created_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: datetime = field(
        default_factory=lambda: datetime.utcnow() + timedelta(days=730)  # 24 months
    )

    @classmethod
    def create(cls, raw_user_id: str) -> ConsentRecord:
        """Factory method to create new consent record."""
        return cls(
            user_id=AnonymousUserId.from_raw(raw_user_id),
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=730),  # 24-month retention
        )

    def give_consent(self, purpose: ProcessingPurpose) -> None:
        """Give consent for a specific purpose."""
        consent = ConsentGiven(
            purpose=purpose,
            given_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=730),  # 24 months
            method="explicit-opt-in",
        )

        self.consents[purpose] = consent
        self.updated_at = datetime.utcnow()

        self._add_event(
            ConsentGivenEvent(
                user_id=self.user_id.value if self.user_id else "",
                purpose=purpose.value,
            )
        )

    def revoke_consent(self, purpose: ProcessingPurpose) -> None:
        """Revoke consent for a specific purpose."""
        if purpose in self.consents:
            del self.consents[purpose]
            self.updated_at = datetime.utcnow()

            self._add_event(
                ConsentRevokedEvent(
                    user_id=self.user_id.value if self.user_id else "",
                    purpose=purpose.value,
                )
            )

    def has_consent(self, purpose: ProcessingPurpose) -> bool:
        """Check if user has valid consent for a purpose."""
        consent = self.consents.get(purpose)
        if not consent:
            return False

        return not consent.is_expired()

    def revoke_all(self) -> None:
        """Revoke all consents."""
        for purpose in list(self.consents.keys()):
            self.revoke_consent(purpose)

    def is_expired(self) -> bool:
        """Check if entire consent record has expired."""
        return datetime.utcnow() > self.expires_at

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "user_id": self.user_id.value if self.user_id else None,
            "consents": {
                purpose.value: consent.to_dict()
                for purpose, consent in self.consents.items()
            },
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
