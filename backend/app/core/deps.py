import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
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
) -> uuid.UUID:
    """Extrae el user_id del JWT. Nunca acepta user_id como parámetro externo."""
    sub = current_user.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sin sub",
        )
    return uuid.UUID(sub)


async def get_establecimiento_id(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID:
    """
    Resuelve el establecimiento_id del usuario autenticado.
    Siempre proviene del JWT+DB — nunca del request body.
    """
    from app.models.establecimientos import UsuarioEstablecimiento

    result = await db.execute(
        select(UsuarioEstablecimiento.establecimiento_id).where(
            UsuarioEstablecimiento.user_id == user_id,
            UsuarioEstablecimiento.activo == True,
        )
    )
    est_id = result.scalar_one_or_none()
    if est_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sin establecimiento asociado. Completá el onboarding.",
        )
    return est_id


async def get_usuario_context(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Devuelve user_id, establecimiento_id y rol del usuario autenticado."""
    from app.models.establecimientos import UsuarioEstablecimiento

    result = await db.execute(
        select(UsuarioEstablecimiento).where(
            UsuarioEstablecimiento.user_id == user_id,
            UsuarioEstablecimiento.activo == True,
        )
    )
    ue = result.scalar_one_or_none()
    if ue is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sin establecimiento asociado. Completá el onboarding.",
        )
    return {
        "user_id": user_id,
        "establecimiento_id": ue.establecimiento_id,
        "rol": ue.rol,
    }


__all__ = [
    "get_current_user",
    "get_current_user_id",
    "get_establecimiento_id",
    "get_usuario_context",
    "get_db",
]
