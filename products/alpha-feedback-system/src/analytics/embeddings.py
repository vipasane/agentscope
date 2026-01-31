"""Embeddings generation using sentence transformers."""

from sentence_transformers import SentenceTransformer

from src.domain.value_objects import Embeddings


class EmbeddingsGenerator:
    """Generate vector embeddings for semantic search."""

    def __init__(
        self, model_name: str = "sentence-transformers/all-mpnet-base-v2"
    ):
        """
        Initialize embeddings model.

        Default model produces 768-dimensional embeddings with excellent
        performance on semantic similarity tasks.
        """
        self.model = SentenceTransformer(model_name)
        self.dimensions = self.model.get_sentence_embedding_dimension()

    async def generate(self, content: str) -> Embeddings:
        """Generate embeddings for content."""
        # Generate embedding
        embedding = self.model.encode(content, convert_to_numpy=True)

        # Convert to list and create Embeddings value object
        return Embeddings(embedding.tolist())

    async def batch_generate(self, contents: list[str]) -> list[Embeddings]:
        """Batch generate embeddings for efficiency."""
        # Generate embeddings in batch
        embeddings_array = self.model.encode(
            contents,
            convert_to_numpy=True,
            show_progress_bar=False,
        )

        # Convert to Embeddings value objects
        return [Embeddings(emb.tolist()) for emb in embeddings_array]

    def get_dimensions(self) -> int:
        """Get embedding dimensions."""
        return self.dimensions
