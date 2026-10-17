from typing import List, Dict, Any
from dataclasses import dataclass, field

@dataclass
class DocumentChunk:
    chunk_index: int
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)

class DocumentChunker:
    def __init__(self, chunk_size: int = 600, overlap: int = 100):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_document(
        self,
        content: str,
        base_metadata: Dict[str, Any]
    ) -> List[DocumentChunk]:
        """Split text content into overlapping text chunks with rich metadata."""
        if not content or not content.strip():
            return []

        # Split by double newline / paragraphs if possible, else sliding character window
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        chunks: List[DocumentChunk] = []
        chunk_idx = 0

        current_chunk = ""
        for p in paragraphs:
            if len(current_chunk) + len(p) + 2 <= self.chunk_size:
                current_chunk = f"{current_chunk}\n\n{p}".strip()
            else:
                if current_chunk:
                    chunks.append(
                        DocumentChunk(
                            chunk_index=chunk_idx,
                            content=current_chunk,
                            metadata={**base_metadata, "chunk_index": chunk_idx}
                        )
                    )
                    chunk_idx += 1
                
                # If paragraph itself exceeds chunk_size, split by sliding window
                if len(p) > self.chunk_size:
                    start = 0
                    while start < len(p):
                        end = start + self.chunk_size
                        sub_text = p[start:end]
                        chunks.append(
                            DocumentChunk(
                                chunk_index=chunk_idx,
                                content=sub_text,
                                metadata={**base_metadata, "chunk_index": chunk_idx}
                            )
                        )
                        chunk_idx += 1
                        start += (self.chunk_size - self.overlap)
                    current_chunk = ""
                else:
                    current_chunk = p

        if current_chunk:
            chunks.append(
                DocumentChunk(
                    chunk_index=chunk_idx,
                    content=current_chunk,
                    metadata={**base_metadata, "chunk_index": chunk_idx}
                )
            )

        return chunks
