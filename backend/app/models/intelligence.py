from pydantic import BaseModel


class WalkthroughStep(BaseModel):
    msg: str
    element: str


class IntelligenceResponse(BaseModel):
    answer: str
    action: str | None = None
    steps: list[WalkthroughStep] | None = None
