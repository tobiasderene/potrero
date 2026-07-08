import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.establecimientos import Establecimiento, UsuarioEstablecimiento
from app.schemas.establecimientos import EstablecimientoCreate, EstablecimientoUpdate


async def create(
    db: AsyncSession,
    data: EstablecimientoCreate,
) -> Establecimiento:
    # created_at/updated_at se setean acá (no server_default vía RETURNING):
    # un INSERT con RETURNING evalúa también la policy de SELECT sobre la fila
    # nueva, y "ver mi establecimiento" exige que exista el vínculo en
    # usuarios_establecimientos — que en este punto todavía no existe (se crea
    # justo después). Evitar el RETURNING evita ese chequeo imposible.
    now = datetime.now(timezone.utc)
    est = Establecimiento(**data.model_dump(), created_at=now, updated_at=now)
    db.add(est)
    await db.flush()
    return est


async def get_by_id(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
) -> Establecimiento | None:
    result = await db.execute(
        select(Establecimiento).where(
            Establecimiento.id == establecimiento_id,
            Establecimiento.activo == True,
        )
    )
    return result.scalar_one_or_none()


async def update(
    db: AsyncSession,
    establecimiento: Establecimiento,
    data: EstablecimientoUpdate,
) -> Establecimiento:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(establecimiento, field, value)
    establecimiento.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return establecimiento


async def create_usuario_establecimiento(
    db: AsyncSession,
    user_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
    rol: str,
) -> UsuarioEstablecimiento:
    ue = UsuarioEstablecimiento(
        user_id=user_id,
        establecimiento_id=establecimiento_id,
        rol=rol,
    )
    db.add(ue)
    await db.flush()
    return ue


async def get_usuario_establecimiento(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> UsuarioEstablecimiento | None:
    result = await db.execute(
        select(UsuarioEstablecimiento).where(
            UsuarioEstablecimiento.user_id == user_id,
            UsuarioEstablecimiento.activo == True,
        )
    )
    return result.scalar_one_or_none()
