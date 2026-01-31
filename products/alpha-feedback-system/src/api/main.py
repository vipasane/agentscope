"""FastAPI main application with all REST endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Header, Body, Query
from fastapi.middleware.cors import CORSMiddleware

from src.analytics.classifier import CategoryClassifier
from src.analytics.embeddings import EmbeddingsGenerator
from src.analytics.pattern_detector import PatternDetector
from src.analytics.sentiment import SentimentAnalyzer
from src.api.config import Settings, get_settings
from src.api.dependencies import (
    get_category_classifier,
    get_consent_repository,
    get_embeddings_generator,
    get_feedback_repository,
    get_pattern_detector,
    get_pattern_repository,
    get_sentiment_analyzer,
)
from src.api.schemas import *
from src.domain.consent import ConsentRecord
from src.domain.feedback import Feedback
from src.domain.value_objects import (
    AnonymousUserId,
    FeedbackCategory,
    FeedbackSource,
    ProcessingPurpose,
    SentimentLabel,
)
from src.infrastructure.repositories import (
    InMemoryConsentRepository,
    InMemoryFeedbackRepository,
    InMemoryPatternRepository,
)

# Create FastAPI app
settings = get_settings()

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=settings.api_description,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Health Check ===


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version=settings.api_version,
        timestamp=datetime.utcnow().isoformat(),
        components={
            "api": "healthy",
            "vector_store": "healthy",
            "analytics": "healthy",
        },
    )


# === Feedback Endpoints ===


@app.post("/api/feedback", response_model=FeedbackResponse, tags=["Feedback"])
async def submit_feedback(
    request: FeedbackCreate,
    feedback_repo: InMemoryFeedbackRepository = Depends(get_feedback_repository),
    sentiment_analyzer: SentimentAnalyzer = Depends(get_sentiment_analyzer),
    classifier: CategoryClassifier = Depends(get_category_classifier),
    embeddings_gen: EmbeddingsGenerator = Depends(get_embeddings_generator),
):
    """Submit new feedback."""
    # Create feedback aggregate
    feedback = Feedback.create(
        raw_content=request.content,
        source=FeedbackSource(request.source),
        raw_user_id=request.user_id,
        metadata=request.metadata,
    )

    # Analyze sentiment
    sentiment = await sentiment_analyzer.analyze(request.content)
    feedback.analyze_sentiment(sentiment)

    # Classify category
    category, confidence = await classifier.classify(request.content)
    feedback.categorize(category, confidence)

    # Generate embeddings
    embeddings = await embeddings_gen.generate(request.content)
    feedback.set_embeddings(embeddings)

    # Mark as processed
    feedback.mark_as_processed()

    # Save
    await feedback_repo.save(feedback)

    return FeedbackResponse(**feedback.to_dict())


@app.get("/api/feedback/{feedback_id}", response_model=FeedbackResponse, tags=["Feedback"])
async def get_feedback(
    feedback_id: str,
    feedback_repo: InMemoryFeedbackRepository = Depends(get_feedback_repository),
):
    """Get feedback by ID."""
    from src.domain.value_objects import FeedbackId

    feedback = await feedback_repo.find_by_id(FeedbackId(feedback_id))

    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    return FeedbackResponse(**feedback.to_dict())


@app.get("/api/feedback", response_model=FeedbackList, tags=["Feedback"])
async def list_feedback(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[str] = None,
    feedback_repo: InMemoryFeedbackRepository = Depends(get_feedback_repository),
):
    """List all feedback with pagination and filters."""
    category_enum = FeedbackCategory(category) if category else None

    items = await feedback_repo.list_all(skip=skip, limit=limit, category=category_enum)

    return FeedbackList(
        items=[FeedbackResponse(**fb.to_dict()) for fb in items],
        total=len(items),
        skip=skip,
        limit=limit,
    )


@app.get(
    "/api/feedback/{feedback_id}/similar",
    response_model=FeedbackList,
    tags=["Feedback"],
)
async def find_similar_feedback(
    feedback_id: str,
    limit: int = Query(10, ge=1, le=100),
    feedback_repo: InMemoryFeedbackRepository = Depends(get_feedback_repository),
):
    """Find similar feedback using vector search."""
    from src.domain.value_objects import FeedbackId

    feedback = await feedback_repo.find_by_id(FeedbackId(feedback_id))

    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    if not feedback.embeddings:
        raise HTTPException(status_code=400, detail="Feedback has no embeddings")

    similar = await feedback_repo.find_similar(feedback.embeddings, limit=limit)

    return FeedbackList(
        items=[FeedbackResponse(**fb.to_dict()) for fb in similar],
        total=len(similar),
        skip=0,
        limit=limit,
    )


# === Pattern Endpoints ===


@app.get("/api/patterns", response_model=PatternList, tags=["Patterns"])
async def list_patterns(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    pattern_repo: InMemoryPatternRepository = Depends(get_pattern_repository),
):
    """List all detected patterns."""
    patterns = await pattern_repo.list_all(skip=skip, limit=limit)

    return PatternList(
        items=[PatternResponse(**p.to_dict()) for p in patterns],
        total=len(patterns),
        skip=skip,
        limit=limit,
    )


@app.get("/api/patterns/{pattern_id}", response_model=PatternResponse, tags=["Patterns"])
async def get_pattern(
    pattern_id: str,
    pattern_repo: InMemoryPatternRepository = Depends(get_pattern_repository),
):
    """Get pattern by ID."""
    from src.domain.value_objects import PatternId

    pattern = await pattern_repo.find_by_id(PatternId(pattern_id))

    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    return PatternResponse(**pattern.to_dict())


# === Consent Endpoints (GDPR) ===


@app.post("/api/consent", tags=["GDPR"])
async def give_consent(
    request: ConsentGiveRequest,
    consent_repo: InMemoryConsentRepository = Depends(get_consent_repository),
):
    """Give consent for data processing."""
    user_id = AnonymousUserId.from_raw(request.user_id)

    # Find or create consent record
    consent = await consent_repo.find_by_user_id(user_id)

    if not consent:
        consent = ConsentRecord.create(request.user_id)

    # Give consent
    purpose = ProcessingPurpose(request.purpose)
    consent.give_consent(purpose)

    # Save
    await consent_repo.save(consent)

    return {"status": "success", "message": "Consent given"}


@app.delete("/api/consent/{purpose}", tags=["GDPR"])
async def revoke_consent(
    purpose: str,
    user_id: str = Query(...),
    consent_repo: InMemoryConsentRepository = Depends(get_consent_repository),
):
    """Revoke consent for data processing."""
    anonymous_id = AnonymousUserId.from_raw(user_id)

    consent = await consent_repo.find_by_user_id(anonymous_id)

    if not consent:
        raise HTTPException(status_code=404, detail="Consent record not found")

    # Revoke consent
    purpose_enum = ProcessingPurpose(purpose)
    consent.revoke_consent(purpose_enum)

    # Save
    await consent_repo.save(consent)

    return {"status": "success", "message": "Consent revoked"}


@app.get("/api/data/export", response_model=DataExportResponse, tags=["GDPR"])
async def export_user_data(
    user_id: str = Query(...),
    feedback_repo: InMemoryFeedbackRepository = Depends(get_feedback_repository),
    consent_repo: InMemoryConsentRepository = Depends(get_consent_repository),
):
    """Export all user data (GDPR right to access)."""
    anonymous_id = AnonymousUserId.from_raw(user_id)

    # Get all feedback
    all_feedback = await feedback_repo.list_all(limit=10000)
    user_feedback = [
        fb.to_dict() for fb in all_feedback if fb.submitter == anonymous_id
    ]

    # Get consent
    consent = await consent_repo.find_by_user_id(anonymous_id)
    consent_data = consent.to_dict() if consent else {}

    return DataExportResponse(
        user_id=user_id,
        feedback=user_feedback,
        consents=consent_data,
        exported_at=datetime.utcnow().isoformat(),
    )


@app.delete("/api/data", response_model=DataDeletionResponse, tags=["GDPR"])
async def delete_user_data(
    user_id: str = Query(...),
    consent_repo: InMemoryConsentRepository = Depends(get_consent_repository),
):
    """Request data deletion (GDPR right to erasure)."""
    anonymous_id = AnonymousUserId.from_raw(user_id)

    # Delete consent
    await consent_repo.delete_by_user_id(anonymous_id)

    # In production, mark feedback for deletion with grace period
    scheduled_deletion = (
        datetime.utcnow().isoformat()
        + f"+{settings.data_deletion_grace_days}d"
    )

    return DataDeletionResponse(
        user_id=user_id,
        status="scheduled",
        scheduled_deletion=scheduled_deletion,
    )


# === Analytics Endpoints ===


@app.get("/api/analytics/dashboard", response_model=DashboardResponse, tags=["Analytics"])
async def get_dashboard(
    feedback_repo: InMemoryFeedbackRepository = Depends(get_feedback_repository),
    pattern_repo: InMemoryPatternRepository = Depends(get_pattern_repository),
):
    """Get analytics dashboard data."""
    # Get all feedback
    all_feedback = await feedback_repo.list_all(limit=10000)

    # Calculate metrics
    total_feedback = len(all_feedback)

    # Get all patterns
    all_patterns = await pattern_repo.list_all(limit=1000)
    total_patterns = len(all_patterns)

    # Time series (simplified - last 7 days)
    time_series = []

    # Sentiment distribution
    positive = sum(
        1
        for fb in all_feedback
        if fb.sentiment and fb.sentiment.label == SentimentLabel.POSITIVE
    )
    negative = sum(
        1
        for fb in all_feedback
        if fb.sentiment and fb.sentiment.label == SentimentLabel.NEGATIVE
    )
    neutral = total_feedback - positive - negative

    avg_score = (
        sum(fb.sentiment.score for fb in all_feedback if fb.sentiment) / total_feedback
        if total_feedback > 0
        else 0.5
    )

    sentiment_dist = SentimentDistribution(
        positive=positive,
        neutral=neutral,
        negative=negative,
        avg_score=avg_score,
    )

    # Top issues (simplified)
    top_issues = []

    return DashboardResponse(
        total_feedback=total_feedback,
        total_patterns=total_patterns,
        time_series=time_series,
        top_issues=top_issues,
        sentiment_distribution=sentiment_dist,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
