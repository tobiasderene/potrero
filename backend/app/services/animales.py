import uuid

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import animales as crud
from app.schemas.animales import AnimalCreate, AnimalUpdate, CambioCategoria


async def crear_animal(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: AnimalCreate,
    user_id: uuid.UUID,
):
    try:
        animal = await crud.create(db, establecimiento_id, data, user_id)
        await db.commit()
        return animal
    except IntegrityError as e:
        await db.rollback()
        orig = str(e.orig).lower()
        if "uq_animales_caravana" in orig or ("caravana_senacsa" in orig and "unique" in orig):
            raise HTTPException(status_code=409, detail=f"Ya existe un animal con caravana '{data.caravana_senacsa}'")
        if "uq_animales_numero_campo" in orig or ("numero_campo" in orig and "unique" in orig):
            raise HTTPException(status_code=409, detail=f"Ya existe un animal con numero de campo '{data.numero_campo}'")
        raise HTTPException(status_code=409, detail="Identificacion duplicada")


async def cambiar_categoria_animal(
    db: AsyncSession,
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
    data: CambioCategoria,
    user_id: uuid.UUID,
) -> Animal:
    animal = await crud.get_by_id(db, animal_id, establecimiento_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Animal no encontrado")
    if animal.estado != "activo":
        raise HTTPException(status_code=400, detail="Solo se puede cambiar la categoría de animales activos")
    await crud.cambiar_categoria(db, animal, data.categoria, user_id)
    await db.commit()
    return animal


async def actualizar_animal(
    db: AsyncSession,
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
    data: AnimalUpdate,
):
    animal = await crud.get_by_id(db, animal_id, establecimiento_id)
    if not animal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Animal no encontrado")
    try:
        animal = await crud.update(db, animal, data)
        await db.commit()
        return animal
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Identificacion duplicada")
