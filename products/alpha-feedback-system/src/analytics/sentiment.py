"""Sentiment analysis using transformer models."""

from typing import Optional

from transformers import pipeline

from src.domain.value_objects import Sentiment, SentimentLabel


class SentimentAnalyzer:
    """Sentiment classifier using DistilBERT."""

    def __init__(self, model_name: str = "distilbert-base-uncased-finetuned-sst-2-english"):
        """Initialize sentiment analysis pipeline."""
        self.classifier = pipeline(
            "sentiment-analysis",
            model=model_name,
            device=-1,  # CPU (-1), use 0 for GPU
        )

    async def analyze(self, content: str) -> Sentiment:
        """
        Analyze sentiment of content.

        Returns:
            Sentiment with label (POSITIVE/NEGATIVE/NEUTRAL) and confidence score
        """
        # Truncate to model max length
        content = content[:512]

        # Run inference
        result = self.classifier(content)[0]

        # Map label
        label_mapping = {
            "POSITIVE": SentimentLabel.POSITIVE,
            "NEGATIVE": SentimentLabel.NEGATIVE,
        }

        label = label_mapping.get(
            result["label"].upper(), SentimentLabel.NEUTRAL
        )

        score = float(result["score"])

        return Sentiment.create(label, score)

    async def batch_analyze(self, contents: list[str]) -> list[Sentiment]:
        """Batch analyze multiple contents for efficiency."""
        # Truncate all contents
        truncated = [c[:512] for c in contents]

        # Run batch inference
        results = self.classifier(truncated)

        sentiments = []
        for result in results:
            label_mapping = {
                "POSITIVE": SentimentLabel.POSITIVE,
                "NEGATIVE": SentimentLabel.NEGATIVE,
            }

            label = label_mapping.get(
                result["label"].upper(), SentimentLabel.NEUTRAL
            )

            score = float(result["score"])

            sentiments.append(Sentiment.create(label, score))

        return sentiments
