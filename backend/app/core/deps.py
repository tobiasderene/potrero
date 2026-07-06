from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_supabase_token
from app.db.session import get_db

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    return verify_supabase_token(credentials.credentials)


async def get_current_user_id(
    current_user: dict = Depends(get_current_user),
) -> UUID:
    """Extrae el user_id del JWT. Nunca acepta user_id como parámetro externo."""
    sub = current_user.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sin sub",
        )
    return UUID(sub)


# Re-exporta get_db para uso en routers
__all__ = ["get_current_user", "get_current_user_id", "get_db"]
