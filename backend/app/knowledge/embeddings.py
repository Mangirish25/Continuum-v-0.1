import os
import numpy as np
from typing import List, Union
from app.core.config import settings
from app.core.logging import logger

class EmbeddingService:
    def __init__(self, model_name: str = settings.EMBEDDING_MODEL):
        self.model_name = model_name
        self._model = None
        self._dimension = 384

    def _load_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading SentenceTransformer embedding model: {self.model_name}")
                self._model = SentenceTransformer(self.model_name)
                self._dimension = self._model.get_sentence_embedding_dimension()
            except Exception as e:
                logger.warning(f"SentenceTransformer not available or failed to load ({e}). Using fallback vector embedder.")
                self._model = "fallback"

    def generate_embedding(self, text: str) -> List[float]:
        """Generate vector embedding for a single text snippet."""
        return self.generate_embeddings([text])[0]

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate vector embeddings for a list of text snippets."""
        if not texts:
            return []
        self._load_model()

        if self._model != "fallback" and hasattr(self._model, "encode"):
            try:
                embeddings = self._model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
                return embeddings.tolist()
            except Exception as e:
                logger.error(f"Error generating embeddings via SentenceTransformer: {e}")

        # Fallback deterministic pseudo-embedding vector of 384 dimensions
        results: List[List[float]] = []
        for t in texts:
            seed = sum(ord(c) for c in t) % 100000
            np.random.seed(seed)
            vec = np.random.normal(0, 1, self._dimension)
            vec = vec / (np.linalg.norm(vec) + 1e-10)
            results.append(vec.tolist())
        return results

embedding_service = EmbeddingService()
