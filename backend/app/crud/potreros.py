import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.potreros import Potrero
from app.schemas.potreros import PotreroCreate, PotreroUpdate


async def create(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: PotreroCreate,
) -> Potrero:
    potrero = Potrero(establecimiento_id=establecimiento_id, **data.model_dump())
    db.add(potrero)
    await db.flush()
    return potrero


async def list_by_establecimiento(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    estado: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Potrero], int]:
    base = select(Potrero).where(Potrero.establecimiento_id == establecimiento_id)
    if estado:
        base = base.where(Potrero.estado == estado)

    total_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = total_result.scalar() or 0

    items_result = await db.execute(
        base.order_by(Potrero.nombre).limit(limit).offset(offset)
    )
    return list(items_result.scalars().all()), total


async def get_by_id(
    db: AsyncSession,
    potrero_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
) -> Potrero | None:
    result = await db.execute(
        select(Potrero).where(
            Potrero.id == potrero_id,
            Potrero.establecimiento_id == establecimiento_id,
        )
    )
    return result.scalar_one_or_none()


async def update(
    db: AsyncSession,
    potrero: Potrero,
    data: PotreroUpdate,
) -> Potrero:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(potrero, field, value)
    potrero.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return potrero
