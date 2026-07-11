import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import lotes as crud
from app.models.animales import Animal
from app.models.lotes import Lote
from app.schemas.lotes import LoteCreate, LoteRead, LoteUpdate


async def crear_lote(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: LoteCreate,
) -> Lote:
    try:
        lote = await crud.create(db, establecimiento_id, data)
        await db.commit()
        return lote
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe un lote con ese nombre en el establecimiento")


async def actualizar_lote(
    db: AsyncSession,
    lote_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
    data: LoteUpdate,
) -> Lote:
    lote = await crud.get_by_id(db, lote_id, establecimiento_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    lote = await crud.update(db, lote, data)
    await db.commit()
    return lote


async def asignar_animales(
    db: AsyncSession,
    lote_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
    animal_ids: list[uuid.UUID],
) -> list[uuid.UUID]:
    """
    Asigna animales al lote. Si alguno ya tiene otro lote activo, lo mueve
    automáticamente (RN-03: un animal, un lote activo).
    """
    lote = await crud.get_by_id(db, lote_id, establecimiento_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    if lote.estado == "cerrado":
        raise HTTPException(status_code=400, detail="No se pueden asignar animales a un lote cerrado")

    result = await db.execute(
        select(Animal).where(
            Animal.id.in_(animal_ids),
            Animal.establecimiento_id == establecimiento_id,
            Animal.estado == "activo",
        )
    )
    animales = result.scalars().all()

    found_ids = {a.id for a in animales}
    missing = [str(aid) for aid in animal_ids if aid not in found_ids]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Animales no encontrados o inactivos: {', '.join(missing)}",
        )

    now = datetime.now(timezone.utc)
    for animal in animales:
        animal.lote_actual_id = lote_id
        animal.updated_at = now

    await db.commit()
    return [a.id for a in animales]


async def build_lote_read(db: AsyncSession, lote: Lote) -> LoteRead:
    total = await crud.count_animales(db, lote.id)
    r = LoteRead.model_validate(lote)
    r.total_animales = total
    return r
