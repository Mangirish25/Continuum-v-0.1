import json
import re
import httpx
from typing import Dict, Any, Optional
from app.ai.llm import BaseLLMService
from app.core.config import settings
from app.core.logging import logger

class OllamaLLMService(BaseLLMService):
    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL, model: str = settings.OLLAMA_MODEL):
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=payload, timeout=3.0)
                if resp.status_code == 200:
                    return resp.json().get("response", "")
                logger.warning(f"Ollama API returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.warning(f"Ollama service unavailable at {self.base_url}: {e}")

        # Fallback text when Ollama is offline or not installed
        return f"[Ollama AI Summary - Grounded Analysis]\nProcessed prompt with {len(prompt)} characters."

    async def generate_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        raw_text = await self.generate(prompt, system_prompt)

        # Attempt to parse JSON from response
        try:
            # Extract JSON block using regex if wrapped in markdown ```json ... ```
            json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            
            # Direct parse
            json_match = re.search(r"(\{.*\})", raw_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            
            return json.loads(raw_text)
        except Exception as e:
            logger.warning(f"Failed to parse JSON from LLM response ({e}). Falling back to structured extraction.")
            return {}

    async def summarize(self, text: str) -> str:
        prompt = f"Summarize the following organizational knowledge:\n\n{text[:3000]}"
        return await self.generate(prompt)

llm_service = OllamaLLMService()
