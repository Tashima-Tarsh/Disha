from __future__ import annotations

from fastapi import Header, HTTPException, status

from ..config import settings


def require_api_token(authorization: str | None = Header(default=None)) -> None:
    if not settings.api_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Server misconfigured: missing DISHA_BRAIN_API_TOKEN",
        )
    if authorization != f"Bearer {settings.api_token}":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API token",
        )
