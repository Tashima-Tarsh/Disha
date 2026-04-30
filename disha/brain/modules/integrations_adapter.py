from __future__ import annotations

from pathlib import Path

from ..config import settings
from .models import (
    IntegrationDescribeResponse,
    IntegrationPreview,
    IntegrationsListResponse,
)


def _integrations_root() -> Path:
    workspace = Path(settings.allowed_workspace).resolve()
    return workspace / "disha" / "services" / "integrations"


def list_integrations(limit: int = 50) -> IntegrationsListResponse:
    root = _integrations_root()
    if not root.is_dir():
        return IntegrationsListResponse(total=0, integrations=[])

    integrations: list[IntegrationPreview] = []
    for entry in sorted(root.iterdir(), key=lambda p: p.name.lower()):
        if not entry.is_dir():
            continue
        readme = entry / "README.md"
        title = ""
        if readme.is_file():
            title = _read_title(readme)
        integrations.append(
            IntegrationPreview(
                name=entry.name, title=title, has_readme=readme.is_file()
            )
        )
        if len(integrations) >= limit:
            break

    return IntegrationsListResponse(total=len(integrations), integrations=integrations)


def describe_integration(
    name: str, max_chars: int = 4000
) -> IntegrationDescribeResponse:
    root = _integrations_root()
    target = (root / name).resolve()
    if not str(target).startswith(str(root.resolve())):
        return IntegrationDescribeResponse(name=name, title="", readme="")
    if not target.is_dir():
        return IntegrationDescribeResponse(name=name, title="", readme="")

    readme = target / "README.md"
    if not readme.is_file():
        return IntegrationDescribeResponse(name=name, title="", readme="")

    text = readme.read_text(encoding="utf-8", errors="replace")
    return IntegrationDescribeResponse(
        name=name, title=_read_title(readme), readme=text[:max_chars]
    )


def _read_title(path: Path) -> str:
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line:
                continue
            if line.startswith("#"):
                return line.lstrip("#").strip()
            return line[:120]
    except Exception:
        return ""
    return ""
