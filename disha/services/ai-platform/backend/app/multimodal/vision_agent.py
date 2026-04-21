import base64
from typing import Optional
import structlog
import httpx

from app.agents.base_agent import BaseAgent
from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class VisionAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="VisionAgent",
            description="Analyzes images for threat intelligence using multimodal AI models",
        )
        self.settings = get_settings()
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client

    async def execute(self, target: str, context: Optional[dict] = None) -> dict:
        context = context or {}
        analysis_type = context.get("analysis_type", "classify")

        image_data = context.get("image_data") or await self._fetch_image(target)

        if not image_data:
            return {
                "agent": self.name,
                "status": "failed",
                "error": "Could not obtain image data",
                "entities": [],
            }

        results = {}
        entities = []

        if analysis_type in ("classify", "detect", "ocr"):
            vision_result = await self._analyze_with_vision_model(
                image_data, analysis_type
            )
            results["vision_analysis"] = vision_result
            entities.extend(self._extract_entities_from_analysis(vision_result))

        if analysis_type == "similarity":
            embedding = await self._compute_visual_embedding(image_data)
            results["visual_embedding"] = embedding

        risk_score = self._compute_visual_risk(results)

        return {
            "agent": self.name,
            "status": "success",
            "analysis_type": analysis_type,
            "results": results,
            "entities": entities,
            "risk_score": risk_score,
        }

    async def _fetch_image(self, url: str) -> Optional[str]:
        try:
            client = await self._get_client()
            response = await client.get(url)
            response.raise_for_status()
            return base64.b64encode(response.content).decode("utf-8")
        except Exception as e:
            logger.warning("image_fetch_failed", url=url, error=str(e))
            return None

    async def _analyze_with_vision_model(
        self, image_base64: str, analysis_type: str
    ) -> dict:
        prompts = {
            "classify": (
                "Analyze this image for threat intelligence. Identify: "
                "1) Type of content (document, satellite, screenshot, photo) "
                "2) Key objects, text, or patterns visible "
                "3) Any indicators of compromise or suspicious elements "
                "4) Geographic or organizational clues "
                "Return structured analysis with confidence scores."
            ),
            "ocr": (
                "Extract ALL text visible in this image. Return: "
                "1) Raw extracted text "
                "2) Language detected "
                "3) Document type (email, form, code, chat, etc.) "
                "4) Any sensitive information indicators (emails, IPs, domains, keys)"
            ),
            "detect": (
                "Perform object detection on this image. For each detected object: "
                "1) Object type/class "
                "2) Approximate location in image "
                "3) Confidence level "
                "4) Security relevance (if any)"
            ),
        }

        prompt = prompts.get(analysis_type, prompts["classify"])

        try:
            client = await self._get_client()
            api_key = self.settings.OPENAI_API_KEY

            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{image_base64}",
                                        "detail": "high",
                                    },
                                },
                            ],
                        }
                    ],
                    "max_tokens": 1500,
                    "temperature": 0.1,
                },
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]

            return {
                "analysis": content,
                "model": "gpt-4o",
                "analysis_type": analysis_type,
                "tokens_used": data.get("usage", {}).get("total_tokens", 0),
            }
        except Exception as e:
            logger.error("vision_analysis_failed", error=str(e))
            return {
                "analysis": None,
                "error": str(e),
                "analysis_type": analysis_type,
            }

    async def _compute_visual_embedding(self, image_base64: str) -> Optional[list]:
        try:
            image_bytes = base64.b64decode(image_base64)
            import hashlib
            import numpy as np

            hash_bytes = hashlib.sha512(image_bytes).digest()
            embedding = np.frombuffer(hash_bytes, dtype=np.uint8).astype(np.float32)

            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            return embedding.tolist()
        except Exception as e:
            logger.error("embedding_computation_failed", error=str(e))
            return None

    def _extract_entities_from_analysis(self, analysis_result: dict) -> list:
        entities = []
        content = analysis_result.get("analysis", "")
        if not content:
            return entities

        entities.append(
            {
                "id": f"image_{hash(content) % 10**8}",
                "label": "Analyzed Image",
                "entity_type": "image",
                "properties": {
                    "analysis_summary": content[:500],
                    "model": analysis_result.get("model", "unknown"),
                },
                "risk_score": 0.0,
            }
        )

        return entities

    def _compute_visual_risk(self, results: dict) -> float:
        risk = 0.0

        analysis = results.get("vision_analysis", {})
        content = (analysis.get("analysis") or "").lower()

        threat_keywords = [
            "malware",
            "phishing",
            "exploit",
            "vulnerability",
            "suspicious",
            "threat",
            "attack",
            "compromise",
            "credential",
            "password",
            "secret",
            "classified",
        ]

        for keyword in threat_keywords:
            if keyword in content:
                risk += 0.1

        return min(risk, 1.0)

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
