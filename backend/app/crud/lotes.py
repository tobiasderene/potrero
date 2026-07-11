import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.animales import Animal
from app.models.lotes import Lote
from app.schemas.lotes import LoteCreate, LoteUpdate


async def create(db: AsyncSession, establecimiento_id: uuid.UUID, data: LoteCreate) -> Lote:
    lote = Lote(
        establecimiento_id=establecimiento_id,
        nombre=data.nombre,
        proposito=data.proposito,
        potrero_principal_id=data.potrero_principal_id,
        fecha_formacion=data.fecha_formacion,
        peso_promedio_ingreso=data.peso_promedio_ingreso,
        peso_objetivo_salida=data.peso_objetivo_salida,
        plazo_estimado_dias=data.plazo_estimado_dias,
    )
    db.add(lote)
    await db.flush()
    return lote


async def get_by_id(db: AsyncSession, lote_id: uuid.UUID, establecimiento_id: uuid.UUID) -> Lote | None:
    result = await db.execute(
        select(Lote).where(Lote.id == lote_id, Lote.establecimiento_id == establecimiento_id)
    )
    return result.scalar_one_or_none()


async def list_by_establecimiento(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    estado: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Lote], int]:
    base = select(Lote).where(Lote.establecimiento_id == establecimiento_id)
    if estado:
        base = base.where(Lote.estado == estado)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
    items = list(
        (await db.execute(
            base.order_by(Lote.fecha_formacion.desc(), Lote.created_at.desc()).limit(limit).offset(offset)
        )).scalars().all()
    )
    return items, total


async def update(db: AsyncSession, lote: Lote, data: LoteUpdate) -> Lote:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lote, field, value)
    lote.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return lote


async def count_animales(db: AsyncSession, lote_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count()).where(Animal.lote_actual_id == lote_id, Animal.estado == "activo")
    )
    return result.scalar() or 0


async def get_animales(
    db: AsyncSession,
    lote_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
) -> list[Animal]:
    result = await db.execute(
        select(Animal).where(
            Animal.lote_actual_id == lote_id,
            Animal.establecimiento_id == establecimiento_id,
            Animal.estado == "activo",
        )
    )
    return list(result.scalars().all())
