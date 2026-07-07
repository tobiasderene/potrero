import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_establecimiento_id, get_db
from app.schemas.establecimientos import (
    EstablecimientoCreate,
    EstablecimientoRead,
    EstablecimientoUpdate,
)
from app.services import establecimientos as svc

router = APIRouter(prefix="/establecimientos", tags=["establecimientos"])


@router.post("", response_model=EstablecimientoRead, status_code=status.HTTP_201_CREATED)
async def crear_establecimiento(
    data: EstablecimientoCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> EstablecimientoRead:
    """Crea el establecimiento y semilla de categorías UG. Solo se puede llamar una vez por usuario."""
    est, _ = await svc.crear_establecimiento(db, data, user_id)
    return EstablecimientoRead.model_validate(est)


@router.get("/me", response_model=EstablecimientoRead)
async def get_mi_establecimiento(
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> EstablecimientoRead:
    from app.crud import establecimientos as crud_est
    from fastapi import HTTPException

    est = await crud_est.get_by_id(db, establecimiento_id)
    if not est:
        raise HTTPException(status_code=404, detail="No encontrado")
    return EstablecimientoRead.model_validate(est)


@router.patch("/me", response_model=EstablecimientoRead)
async def actualizar_establecimiento(
    data: EstablecimientoUpdate,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> EstablecimientoRead:
    est = await svc.actualizar_establecimiento(db, establecimiento_id, data)
    return EstablecimientoRead.model_validate(est)
