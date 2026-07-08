import json
import logging
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_supabase_token
from app.db.session import get_db as _get_raw_db

logger = logging.getLogger(__name__)

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


async def get_db(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(_get_raw_db),
) -> AsyncSession:
    """
    Sesión de DB con el contexto RLS del usuario ya seteado.

    La conexión corre con un rol sin BYPASSRLS (a diferencia del rol
    "postgres"), así que sin este SET las policies basadas en auth.uid()
    verían NULL y no aplicarían el filtro por establecimiento. Se usa
    is_local=false (no SET LOCAL) porque varios endpoints hacen commit()
    a mitad de request y siguen consultando después (ej. refresh()); un
    SET LOCAL se perdería al terminar esa transacción.
    """
    claims = json.dumps({"sub": str(user_id), "role": "authenticated"})
    await db.execute(
        text(
            "SELECT "
            "set_config('request.jwt.claims', :claims, false), "
            "set_config('request.jwt.claim.sub', :sub, false), "
            "set_config('request.jwt.claim.role', 'authenticated', false)"
        ),
        {"claims": claims, "sub": str(user_id)},
    )

    # DEBUG temporal — confirmar qué ve Postgres realmente. Sacar una vez
    # resuelto el 500 de "new row violates row-level security policy".
    diag = await db.execute(
        text(
            "SELECT auth.uid(), current_user, "
            "current_setting('request.jwt.claims', true), "
            "current_setting('request.jwt.claim.sub', true)"
        )
    )
    row = diag.first()
    logger.info(
        "RLS debug: auth.uid()=%s current_user=%s claims=%s claim.sub=%s expected_user_id=%s",
        row[0], row[1], row[2], row[3], user_id,
    )

    return db


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
