import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import establecimientos as crud_est
from app.crud import categorias as crud_cat
from app.models.establecimientos import Establecimiento, UsuarioEstablecimiento
from app.schemas.establecimientos import EstablecimientoCreate, EstablecimientoUpdate


async def crear_establecimiento(
    db: AsyncSession,
    data: EstablecimientoCreate,
    user_id: uuid.UUID,
) -> tuple[Establecimiento, UsuarioEstablecimiento]:
    """
    Crea el establecimiento, semilla de categorías UG y vincula al usuario
    como propietario. Todo en una sola transacción.
    """
    ue_existente = await crud_est.get_usuario_establecimiento(db, user_id)
    if ue_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El usuario ya tiene un establecimiento asociado",
        )

    establecimiento = await crud_est.create(db, data)
    await crud_cat.seed_para_establecimiento(db, establecimiento.id)
    ue = await crud_est.create_usuario_establecimiento(
        db, user_id, establecimiento.id, rol="propietario"
    )
    await db.commit()
    await db.refresh(establecimiento)
    await db.refresh(ue)
    return establecimiento, ue


async def actualizar_establecimiento(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: EstablecimientoUpdate,
) -> Establecimiento:
    est = await crud_est.get_by_id(db, establecimiento_id)
    if not est:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No encontrado")
    est = await crud_est.update(db, est, data)
    await db.commit()
    await db.refresh(est)
    return est
