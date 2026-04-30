import base64
import io

import httpx
import structlog
from app.agents.base_agent import BaseAgent
from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class AudioAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="AudioAgent",
            description="Analyzes audio content for threat intelligence using speech AI models",
        )
        self.settings = get_settings()
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=120.0)
        return self._client

    async def execute(self, target: str, context: dict | None = None) -> dict:
        context = context or {}
        analysis_type = context.get("analysis_type", "transcribe")

        audio_data = context.get("audio_data") or await self._fetch_audio(target)

        if not audio_data:
            return {
                "agent": self.name,
                "status": "failed",
                "error": "Could not obtain audio data",
                "entities": [],
            }

        results = {}
        entities = []

        transcript = await self._transcribe(audio_data, context.get("language"))
        results["transcription"] = transcript

        if transcript.get("text"):
            if analysis_type in ("analyze", "keywords"):
                analysis = await self._analyze_transcript(transcript["text"])
                results["analysis"] = analysis
                entities.extend(self._extract_entities(analysis))

            keywords = self._spot_keywords(transcript["text"])
            results["keywords_detected"] = keywords

            entities.append(
                {
                    "id": f"audio_{hash(transcript['text'][:100]) % 10**8}",
                    "label": "Audio Transcript",
                    "entity_type": "audio",
                    "properties": {
                        "text_preview": transcript["text"][:500],
                        "language": transcript.get("language", "unknown"),
                        "duration": transcript.get("duration"),
                        "keywords_found": len(keywords),
                    },
                    "risk_score": self._compute_audio_risk(results),
                }
            )

        return {
            "agent": self.name,
            "status": "success",
            "analysis_type": analysis_type,
            "results": results,
            "entities": entities,
            "risk_score": self._compute_audio_risk(results),
        }

    async def _fetch_audio(self, url: str) -> str | None:
        try:
            client = await self._get_client()
            response = await client.get(url)
            response.raise_for_status()
            return base64.b64encode(response.content).decode("utf-8")
        except Exception as e:
            logger.warning("audio_fetch_failed", url=url, error=str(e))
            return None

    async def _transcribe(self, audio_base64: str, language: str | None = None) -> dict:
        try:
            client = await self._get_client()
            api_key = self.settings.OPENAI_API_KEY

            audio_bytes = base64.b64decode(audio_base64)

            files = {"file": ("audio.wav", io.BytesIO(audio_bytes), "audio/wav")}
            data = {"model": "whisper-1"}
            if language:
                data["language"] = language

            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {api_key}"},
                files=files,
                data=data,
                timeout=120.0,
            )
            response.raise_for_status()
            result = response.json()

            return {
                "text": result.get("text", ""),
                "language": result.get("language", language or "unknown"),
                "duration": result.get("duration"),
            }
        except Exception as e:
            logger.error("transcription_failed", error=str(e))
            return {"text": "", "error": str(e)}

    async def _analyze_transcript(self, text: str) -> dict:
        try:
            client = await self._get_client()
            api_key = self.settings.OPENAI_API_KEY

            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": self.settings.LLM_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a threat intelligence analyst. Analyze the following "
                                "audio transcript for security-relevant information. Identify: "
                                "1) Key topics and subjects discussed "
                                "2) Named entities (people, organizations, locations) "
                                "3) Technical indicators (IPs, domains, tools mentioned) "
                                "4) Threat indicators or suspicious content "
                                "5) Overall threat assessment"
                            ),
                        },
                        {"role": "user", "content": f"Transcript:\n{text[:3000]}"},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 1000,
                },
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()

            return {
                "analysis": data["choices"][0]["message"]["content"],
                "model": self.settings.LLM_MODEL,
            }
        except Exception as e:
            logger.error("transcript_analysis_failed", error=str(e))
            return {"analysis": None, "error": str(e)}

    def _spot_keywords(self, text: str) -> list:
        threat_keywords = [
            "attack",
            "exploit",
            "vulnerability",
            "breach",
            "malware",
            "ransomware",
            "phishing",
            "credential",
            "password",
            "bitcoin",
            "monero",
            "tor",
            "vpn",
            "proxy",
            "encrypted",
            "dark web",
            "zero day",
            "backdoor",
            "rootkit",
            "botnet",
            "ddos",
            "exfiltrate",
            "payload",
            "command and control",
            "c2",
        ]

        text_lower = text.lower()
        found = [kw for kw in threat_keywords if kw in text_lower]
        return found

    def _extract_entities(self, analysis: dict) -> list:
        entities = []
        content = analysis.get("analysis", "")
        if not content:
            return entities

        entities.append(
            {
                "id": f"audio_analysis_{hash(content[:100]) % 10**8}",
                "label": "Audio Intelligence",
                "entity_type": "intelligence_report",
                "properties": {
                    "summary": content[:500],
                    "source": "audio_analysis",
                },
                "risk_score": 0.0,
            }
        )

        return entities

    def _compute_audio_risk(self, results: dict) -> float:
        risk = 0.0

        keywords = results.get("keywords_detected", [])
        risk += min(len(keywords) * 0.08, 0.5)

        analysis = results.get("analysis", {})
        content = (analysis.get("analysis") or "").lower()

        high_risk_terms = [
            "critical",
            "immediate threat",
            "active attack",
            "breach confirmed",
        ]
        for term in high_risk_terms:
            if term in content:
                risk += 0.15

        return min(risk, 1.0)

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
