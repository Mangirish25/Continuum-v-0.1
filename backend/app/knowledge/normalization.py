import hashlib
from typing import Optional
from app.integrations.base import NormalizedDocument

def compute_content_hash(content: str) -> str:
    """Compute SHA-256 hash of document content for deduplication."""
    cleaned = content.strip().encode('utf-8')
    return hashlib.sha256(cleaned).hexdigest()

def normalize_text_content(text: str) -> str:
    """Clean and normalize whitespace in text content."""
    lines = [line.rstrip() for line in text.splitlines()]
    return "\n".join(lines).strip()
