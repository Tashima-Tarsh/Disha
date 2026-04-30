from fastapi import APIRouter, HTTPException, status

from app.core.security import create_access_token, hash_password, verify_password
from app.models.schemas import AuthRequest, AuthResponse

router = APIRouter()

_demo_users: dict[str, dict[str, str]] = {}


@router.post("/auth/register", response_model=AuthResponse)
async def register(request: AuthRequest):
    if request.email in _demo_users:
        raise HTTPException(status_code=400, detail="User already exists")

    user_id = f"user-{len(_demo_users) + 1}"
    _demo_users[request.email] = {
        "user_id": user_id,
        "email": request.email,
        "password_hash": hash_password(request.password),
    }

    token = create_access_token({"sub": user_id, "email": request.email})
    return AuthResponse(access_token=token, user_id=user_id)


@router.post("/auth/login", response_model=AuthResponse)
async def login(request: AuthRequest):
    user = _demo_users.get(request.email)
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token({"sub": user["user_id"], "email": request.email})
    return AuthResponse(access_token=token, user_id=user["user_id"])
