from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.agents.physics_agent import PhysicsAgent


router = APIRouter()


@router.post("/simulate")
async def run_molecular_simulation(
    material: str,
    options: Dict[str, Any] | None = None,
    current_user: Dict = Depends(get_current_user)
):
    """
    Run an advanced molecular dynamics simulation.
    Requires authentication.
    """
    try:
        agent = PhysicsAgent()
        results = await agent.run(material, options or {})
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@router.get("/materials")
async def get_supported_materials(current_user: Dict = Depends(get_current_user)):
    """
    Get the list of supported materials for the Physics Layer.
    """
    agent = PhysicsAgent()
    return {"materials": list(agent.material_db.keys())}
