from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class NormalizedDocument:
    external_id: str
    title: str
    content: str
    provider: str
    source_url: Optional[str] = None
    employee_id: Optional[str] = None
    project_id: Optional[str] = None
    doc_metadata: Dict[str, Any] = field(default_factory=dict)

class BaseConnector(ABC):
    @abstractmethod
    async def validate_connection(self) -> bool:
        """Verify that credentials or connection endpoints are valid."""
        pass

    @abstractmethod
    async def list_resources(self) -> List[Dict[str, Any]]:
        """List available resources (folders, repos, pages, projects)."""
        pass

    @abstractmethod
    async def fetch_documents(self, external_resource_id: str, **kwargs) -> List[NormalizedDocument]:
        """Fetch and normalize documents from the target resource."""
        pass
