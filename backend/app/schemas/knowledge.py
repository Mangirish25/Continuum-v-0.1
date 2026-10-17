from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class KnowledgeSearchRequest(BaseModel):
    query: str
    employee_id: Optional[str] = None
    project_id: Optional[str] = None
    provider: Optional[str] = None
    knowledge_type: Optional[str] = None
    limit: int = Field(default=10, ge=1, le=50)

class KnowledgeSearchEvidence(BaseModel):
    chunk_id: str
    document_id: str
    content: str
    score: float
    title: str
    provider: str
    source_url: Optional[str] = None
    employee: Optional[Dict[str, Any]] = None
    project: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = {}

class KnowledgeSearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[KnowledgeSearchEvidence]
    llm_explanation: Optional[str] = None
