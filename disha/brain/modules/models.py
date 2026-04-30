from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ModuleHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    status: str = Field(description="ok|degraded|down|disabled")
    reason: str = ""
    target: str = ""


class ModulesHealthResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str
    modules: list[ModuleHealth]
