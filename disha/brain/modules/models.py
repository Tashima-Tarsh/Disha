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


class StrategyConflictPreview(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = ""
    name: str = ""
    year: int | None = None
    era: str = ""
    region: str = ""
    terrain: str = ""
    outcome: str = ""


class StrategyOverviewResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    total_conflicts: int
    eras: dict[str, int]
    regions: dict[str, int]
    preview: list[StrategyConflictPreview]


class IntegrationPreview(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    title: str = ""
    has_readme: bool = False


class IntegrationsListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    total: int
    integrations: list[IntegrationPreview]


class IntegrationDescribeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    title: str = ""
    readme: str = ""
