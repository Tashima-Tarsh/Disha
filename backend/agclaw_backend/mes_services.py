from __future__ import annotations

from collections import Counter
import json
import os
from functools import lru_cache
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .contracts import (
    LogSlimRequest,
    LogSlimResponse,
    MesDataset,
    MesDocument,
    MesRetrieveRequest,
    MesRetrieveResponse,
    ScreenInterpretRequest,
    ScreenInterpretResponse,
)


def _request_json(url: str, payload: dict[str, object], headers: dict[str, str]) -> dict[str, object]:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        body = error.read().decode("utf-8")
        raise RuntimeError(body or f"Vision endpoint returned HTTP {error.code}") from error
    except URLError as error:
        raise RuntimeError(str(error.reason)) from error


def _data_dir() -> Path:
    return Path(__file__).resolve().parent / "data"


def _registry_path() -> Path:
    configured = os.getenv("AGCLAW_MES_REGISTRY_PATH", "").strip()
    if configured:
        return Path(configured)
    return _data_dir() / "mes_dataset_registry.json"


def _resolve_dataset_file(file_name: str) -> Path:
    return _registry_path().parent / file_name


@lru_cache(maxsize=1)
def _load_dataset_registry() -> list[MesDataset]:
    payload = json.loads(_registry_path().read_text(encoding="utf-8"))
    return [MesDataset(**item) for item in payload]


@lru_cache(maxsize=1)
def _load_reference_documents() -> list[MesDocument]:
    documents: list[MesDocument] = []
    for dataset in _load_dataset_registry():
        dataset_path = _resolve_dataset_file(dataset.file)
        payload = json.loads(dataset_path.read_text(encoding="utf-8"))
        for document in payload:
            documents.append(
                MesDocument(
                    source=document.get("source", dataset.name),
                    title=document.get("title", ""),
                    excerpt=document.get("excerpt", ""),
                    tags=document.get("tags", []),
                    dataset_id=dataset.id,
                    dataset_version=dataset.version,
                )
            )
    return documents


def list_mes_datasets() -> list[MesDataset]:
    return list(_load_dataset_registry())


def _extract_vision_summary(response: dict[str, object]) -> str:
    choices = response.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""
    message = choices[0].get("message", {}) if isinstance(choices[0], dict) else {}
    content = message.get("content", "") if isinstance(message, dict) else ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            part.get("text", "")
            for part in content
            if isinstance(part, dict)
        )
    return ""


def _vision_adapter() -> tuple[str, str, str, str]:
    provider = os.getenv("AGCLAW_SCREEN_VISION_PROVIDER", "").strip().lower()
    base_url = os.getenv("AGCLAW_SCREEN_VISION_BASE_URL", "").strip()
    api_key = os.getenv("AGCLAW_SCREEN_VISION_API_KEY", "").strip()
    model = os.getenv("AGCLAW_SCREEN_VISION_MODEL", "").strip()
    return provider, base_url, api_key, model


def _run_openai_vision(prompt: str, image_data_url: str) -> tuple[str, str]:
    provider, base_url, api_key, model = _vision_adapter()
    if provider not in {"openai-compatible", "ollama", "vllm"} or not base_url or not model or not image_data_url:
        return "heuristic", ""

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        ],
        "temperature": 0.1,
        "max_tokens": 500,
        "stream": False,
    }
    headers = {
        "Content-Type": "application/json",
        **({"Authorization": f"Bearer {api_key}"} if api_key else {}),
    }
    response = _request_json(f"{base_url.rstrip('/')}/v1/chat/completions", payload, headers)
    return provider, _extract_vision_summary(response)


def slim_log(request: LogSlimRequest) -> LogSlimResponse:
    lines = [line.rstrip() for line in request.text.splitlines() if line.strip()]
    preserved: list[str] = []
    seen = Counter[str]()

    for line in lines:
        normalized = " ".join(line.split())
        should_keep = any(token and token.lower() in normalized.lower() for token in request.preserve_tokens)
        if should_keep or seen[normalized] == 0:
            preserved.append(line)
        seen[normalized] += 1
        if len(preserved) >= request.max_lines:
            break

    return LogSlimResponse(
        original_lines=len(lines),
        kept_lines=len(preserved),
        text="\n".join(preserved),
    )


def retrieve_mes_context(request: MesRetrieveRequest) -> MesRetrieveResponse:
    query_terms = {term.lower() for term in request.query.split() if term.strip()}
    domains = {domain.lower() for domain in request.domains}
    dataset_filter = {dataset_id.lower() for dataset_id in request.dataset_ids}
    datasets = list_mes_datasets()
    documents = _load_reference_documents()

    scored: list[tuple[int, MesDocument]] = []
    for document in documents:
        if dataset_filter and document.dataset_id.lower() not in dataset_filter:
            continue
        haystack = " ".join(
            [
                document.title,
                document.excerpt,
                " ".join(document.tags),
                document.dataset_id,
                document.dataset_version,
            ]
        ).lower()
        score = sum(1 for term in query_terms if term in haystack)
        if domains and not domains.intersection({tag.lower() for tag in document.tags}):
            score -= 1
        if score > 0 or not query_terms:
            scored.append((score, document))

    scored.sort(key=lambda item: item[0], reverse=True)
    results = [document for _, document in scored[: max(1, request.limit)]]
    visible_dataset_ids = {document.dataset_id for document in results}
    visible_datasets = [dataset for dataset in datasets if dataset.id in visible_dataset_ids or dataset.id in request.dataset_ids]
    return MesRetrieveResponse(query=request.query, results=results, datasets=visible_datasets)


def interpret_screen(request: ScreenInterpretRequest) -> ScreenInterpretResponse:
    haystack = " ".join([request.title, request.notes, *request.visible_labels]).lower()
    observations: list[str] = []
    risks: list[str] = []
    recommended_follow_up: list[str] = []
    adapter = "heuristic"

    if request.image_name:
        observations.append(f"Attached screenshot received: {request.image_name}.")
        recommended_follow_up.append("Compare the uploaded screen against OCR notes so visible state and typed notes do not diverge.")
    if request.image_data_url.startswith("data:image/"):
        image_kind = request.image_data_url.split(";", 1)[0].replace("data:", "")
        observations.append(f"Screenshot payload type detected: {image_kind}.")
        vision_prompt = (
            "Review this industrial HMI or SCADA screenshot in advisory mode. "
            "Summarize visible alarms, operating mode, batch or recipe context, quality hold or release state, "
            "and any operator prompts. Do not suggest control actions."
        )
        try:
            adapter, vision_summary = _run_openai_vision(vision_prompt, request.image_data_url)
            if vision_summary.strip():
                observations.append(f"Vision summary: {vision_summary.strip()}")
        except RuntimeError as error:
            risks.append(f"Vision adapter fallback triggered: {error}")
            adapter = "heuristic"

    if any(term in haystack for term in ["alarm", "fault", "trip"]):
        observations.append("The screen indicates an alarmed or faulted condition that should be reviewed before any operational changes.")
        risks.append("Do not recommend overrides or forced run actions while alarm context is incomplete.")
    if any(term in haystack for term in ["batch", "lot", "recipe"]):
        observations.append("The screen appears tied to active batch or recipe execution, so genealogy and release impact should be considered.")
        recommended_follow_up.append("Capture batch id, recipe id, and operator acknowledgement state for traceability.")
    if any(term in haystack for term in ["manual", "override", "hand"]):
        observations.append("The interface suggests a manual or override-capable operating mode.")
        risks.append("Manual override recommendations require explicit human review and safety confirmation.")
    if any(term in haystack for term in ["hold", "quality", "release"]):
        observations.append("Quality or release controls are visible on the screen.")
        risks.append("Recommendations must preserve hold/release approval steps and reason-code traceability.")

    if not observations:
        observations.append("The screen can be used for descriptive review, but the visible state is not specific enough for operational recommendations.")
    if not risks:
        risks.append("Maintain advisory-only guidance until machine state, alarm context, and approval workflow are verified.")
    if not recommended_follow_up:
        recommended_follow_up.extend(
            [
                "Collect operator-visible labels and active status indicators.",
                "Pair the screenshot with event logs before proposing any workflow change.",
            ]
        )

    return ScreenInterpretResponse(
        summary=f"Reviewed screen '{request.title or 'unnamed screen'}' in research mode.",
        adapter=adapter,
        observations=observations,
        risks=risks,
        recommended_follow_up=recommended_follow_up,
    )
