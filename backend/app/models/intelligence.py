from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class WalkthroughStep(BaseModel):
    msg: str
    element: str

class IntelligenceResponse(BaseModel):
    answer: str
    action: Optional[str] = None
    steps: Optional[List[WalkthroughStep]] = None
