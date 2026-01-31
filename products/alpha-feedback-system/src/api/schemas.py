"""API request/response schemas using Pydantic."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# === Feedback Schemas ===


class FeedbackCreate(BaseModel):
    """Request schema for creating feedback."""

    content: str = Field(..., min_length=1, max_length=10000)
    source: str = Field(default="in-app")
    user_id: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class FeedbackResponse(BaseModel):
    """Response schema for feedback."""

    id: str
    content: str
    category: Optional[str] = None
    sentiment: Optional[dict[str, Any]] = None
    source: str
    status: str
    submitted_at: str
    updated_at: str
    related_patterns: list[str] = Field(default_factory=list)


class FeedbackList(BaseModel):
    """Response schema for list of feedback."""

    items: list[FeedbackResponse]
    total: int
    skip: int
    limit: int


# === Pattern Schemas ===


class PatternResponse(BaseModel):
    """Response schema for pattern."""

    id: str
    pattern: Optional[dict[str, Any]] = None
    frequency: int
    severity: str
    priority: int
    related_feedback: list[str]
    detected_at: str
    updated_at: str


class PatternList(BaseModel):
    """Response schema for list of patterns."""

    items: list[PatternResponse]
    total: int
    skip: int
    limit: int


class PredictionRequest(BaseModel):
    """Request schema for prediction."""

    context: str


class PredictionResponse(BaseModel):
    """Response schema for prediction."""

    likely_issue: str
    probability: float
    suggested_action: str
    severity: str


# === Consent Schemas ===


class ConsentGiveRequest(BaseModel):
    """Request schema for giving consent."""

    user_id: str
    purpose: str


class ConsentRevokeRequest(BaseModel):
    """Request schema for revoking consent."""

    user_id: str
    purpose: str


class ConsentResponse(BaseModel):
    """Response schema for consent."""

    user_id: str
    consents: dict[str, dict[str, Any]]
    created_at: str
    expires_at: str


# === Analytics Schemas ===


class TimeSeriesPoint(BaseModel):
    """Single point in time series."""

    timestamp: str
    count: int
    sentiment_avg: Optional[float] = None


class TopIssue(BaseModel):
    """Top issue ranking."""

    category: str
    count: int
    avg_sentiment: float
    severity: str


class SentimentDistribution(BaseModel):
    """Sentiment distribution stats."""

    positive: int
    neutral: int
    negative: int
    avg_score: float


class DashboardResponse(BaseModel):
    """Dashboard analytics response."""

    total_feedback: int
    total_patterns: int
    time_series: list[TimeSeriesPoint]
    top_issues: list[TopIssue]
    sentiment_distribution: SentimentDistribution


# === GDPR Schemas ===


class DataExportRequest(BaseModel):
    """Request schema for data export."""

    user_id: str


class DataExportResponse(BaseModel):
    """Response schema for data export."""

    user_id: str
    feedback: list[dict[str, Any]]
    consents: dict[str, Any]
    exported_at: str


class DataDeletionRequest(BaseModel):
    """Request schema for data deletion."""

    user_id: str


class DataDeletionResponse(BaseModel):
    """Response schema for data deletion."""

    user_id: str
    status: str
    scheduled_deletion: str


# === Webhook Schemas ===


class GitHubWebhookPayload(BaseModel):
    """GitHub webhook payload."""

    action: str
    issue: Optional[dict[str, Any]] = None
    discussion: Optional[dict[str, Any]] = None
    repository: dict[str, Any]


# === Health Check ===


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    timestamp: str
    components: dict[str, str]
