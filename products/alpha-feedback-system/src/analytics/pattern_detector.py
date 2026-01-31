"""Pattern detection from feedback clusters."""

from collections import Counter
from typing import Any

from src.domain.feedback import Feedback
from src.domain.pattern import FeedbackPattern, PatternDescription
from src.domain.value_objects import FeedbackCategory, SentimentLabel
from src.infrastructure.vector_store import HNSWVectorStore


class PatternDetector:
    """Detect patterns in feedback clusters using HNSW clustering."""

    def __init__(self, vector_store: HNSWVectorStore):
        self.vector_store = vector_store

    async def detect_patterns(
        self,
        feedback_batch: list[Feedback],
        min_cluster_size: int = 3,
    ) -> list[FeedbackPattern]:
        """
        Detect patterns from a batch of feedback.

        Args:
            feedback_batch: List of feedback to analyze
            min_cluster_size: Minimum feedback count to form a pattern

        Returns:
            List of detected patterns
        """
        if len(feedback_batch) < min_cluster_size:
            return []

        # Extract embeddings
        embeddings_list = [
            fb.embeddings for fb in feedback_batch if fb.embeddings
        ]

        if len(embeddings_list) < min_cluster_size:
            return []

        # Cluster using HNSW
        clusters = self.vector_store.cluster(
            embeddings_list, min_cluster_size=min_cluster_size
        )

        # Extract patterns from clusters
        patterns = []

        for cluster_indices in clusters:
            cluster_feedback = [feedback_batch[i] for i in cluster_indices]

            # Extract pattern description
            pattern_desc = self._extract_pattern_description(cluster_feedback)

            # Assess severity
            severity = self._assess_severity(cluster_feedback)

            # Create pattern
            pattern = FeedbackPattern.detect(
                cluster_feedback,
                pattern_desc,
                severity=severity,
            )

            patterns.append(pattern)

        return patterns

    def _extract_pattern_description(
        self, cluster: list[Feedback]
    ) -> PatternDescription:
        """Extract common pattern from feedback cluster."""
        # Find most common category
        categories = [fb.category for fb in cluster if fb.category]

        if not categories:
            most_common_category = FeedbackCategory.OTHER
        else:
            category_counts = Counter(categories)
            most_common_category = category_counts.most_common(1)[0][0]

        # Extract keywords (simplified - in production, use TF-IDF or TextRank)
        all_words: list[str] = []

        for fb in cluster:
            if fb.content:
                words = fb.content.value.lower().split()
                all_words.extend(words)

        # Get top keywords
        word_counts = Counter(all_words)

        # Filter out common words (simplified stop words)
        stop_words = {
            "the", "a", "an", "and", "or", "but", "is", "was", "are", "were",
            "to", "of", "in", "on", "at", "for", "with", "this", "that",
        }

        keywords = [
            word
            for word, count in word_counts.most_common(10)
            if word not in stop_words and len(word) > 3
        ][:5]

        # Calculate average sentiment
        sentiments = [fb.sentiment for fb in cluster if fb.sentiment]

        if sentiments:
            avg_score = sum(s.score for s in sentiments) / len(sentiments)
        else:
            avg_score = 0.5

        return PatternDescription(
            category=most_common_category,
            keywords=keywords,
            avg_sentiment_score=avg_score,
        )

    def _assess_severity(self, cluster: list[Feedback]) -> str:
        """Assess severity based on sentiment and category."""
        # Count negative sentiments
        negative_count = sum(
            1
            for fb in cluster
            if fb.sentiment and fb.sentiment.label == SentimentLabel.NEGATIVE
        )

        negative_ratio = negative_count / len(cluster) if cluster else 0

        # Check for critical categories
        critical_categories = {
            FeedbackCategory.SECURITY,
            FeedbackCategory.BUG,
        }

        has_critical_category = any(
            fb.category in critical_categories for fb in cluster if fb.category
        )

        # Determine severity
        if has_critical_category:
            return "critical"
        elif negative_ratio > 0.7:
            return "high"
        elif negative_ratio > 0.4:
            return "medium"
        else:
            return "low"

    async def find_matching_patterns(
        self,
        feedback: Feedback,
        existing_patterns: list[FeedbackPattern],
        similarity_threshold: float = 0.8,
    ) -> list[FeedbackPattern]:
        """
        Find existing patterns that match new feedback.

        Args:
            feedback: New feedback to match
            existing_patterns: Existing patterns to check
            similarity_threshold: Minimum similarity to match

        Returns:
            List of matching patterns
        """
        if not feedback.embeddings:
            return []

        matching = []

        for pattern in existing_patterns:
            if not pattern.embeddings:
                continue

            similarity = feedback.embeddings.cosine_similarity(pattern.embeddings)

            if similarity >= similarity_threshold:
                matching.append(pattern)

        return matching
