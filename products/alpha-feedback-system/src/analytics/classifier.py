"""Category classification using zero-shot learning."""

from transformers import pipeline

from src.domain.value_objects import FeedbackCategory


class CategoryClassifier:
    """Category classifier using zero-shot classification."""

    CATEGORIES = [
        ("bug", "This is a bug report or error description"),
        ("feature", "This is a feature request or enhancement suggestion"),
        ("performance", "This is about performance, speed, or optimization"),
        ("ux", "This is about user experience or usability"),
        ("docs", "This is about documentation or tutorials"),
        ("security", "This is about security, vulnerabilities, or privacy"),
        ("api", "This is about the API or programming interface"),
        ("integration", "This is about integration with other tools or services"),
        ("deployment", "This is about deployment, installation, or configuration"),
        ("other", "This doesn't fit into other categories"),
    ]

    def __init__(
        self, model_name: str = "facebook/bart-large-mnli"
    ):
        """Initialize zero-shot classifier."""
        self.classifier = pipeline(
            "zero-shot-classification",
            model=model_name,
            device=-1,  # CPU
        )

    async def classify(self, content: str) -> tuple[FeedbackCategory, float]:
        """
        Classify feedback content into category.

        Returns:
            (category, confidence_score)
        """
        # Truncate to model max length
        content = content[:512]

        # Extract category labels and descriptions
        category_labels = [cat for cat, desc in self.CATEGORIES]
        category_descriptions = [desc for cat, desc in self.CATEGORIES]

        # Run zero-shot classification
        result = self.classifier(
            content,
            category_descriptions,
            multi_label=False,
        )

        # Get top prediction
        top_label_idx = 0  # Labels are sorted by score
        top_category = category_labels[top_label_idx]
        confidence = float(result["scores"][top_label_idx])

        # Map to FeedbackCategory enum
        category = FeedbackCategory(top_category)

        return category, confidence

    async def batch_classify(
        self, contents: list[str]
    ) -> list[tuple[FeedbackCategory, float]]:
        """Batch classify multiple contents."""
        results = []

        for content in contents:
            category, confidence = await self.classify(content)
            results.append((category, confidence))

        return results
