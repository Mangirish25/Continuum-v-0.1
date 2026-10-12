import json
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from app.core.config import settings
from app.core.logging import logger

class BaseLLMService(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate text from prompt."""
        pass

    @abstractmethod
    async def generate_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Generate valid JSON object from prompt."""
        pass

    @abstractmethod
    async def summarize(self, text: str) -> str:
        """Summarize text content."""
        pass
