import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_establecimiento_id, get_db
from app.crud import potreros as crud
from app.schemas.common import Paginated
from app.schemas.movimientos import CargaAnimalRead
from app.schemas.potreros import EstadoPotrero, PotreroCreate, PotreroRead, PotreroUpdate
from app.services import potreros as svc_potreros

router = APIRouter(prefix="/potreros", tags=["potreros"])


@router.get("", response_model=Paginated[PotreroRead])
async def list_potreros(
    estado: EstadoPotrero | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> Paginated[PotreroRead]:
    items, total = await crud.list_by_establecimiento(
        db, establecimiento_id, estado=estado, limit=limit, offset=offset
    )
    return Paginated(
        items=[PotreroRead.model_validate(p) for p in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=PotreroRead, status_code=status.HTTP_201_CREATED)
async def crear_potrero(
    data: PotreroCreate,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> PotreroRead:
    potrero = await crud.create(db, establecimiento_id, data)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe un potrero con ese nombre")
    return PotreroRead.model_validate(potrero)


@router.get("/cargas", response_model=list[CargaAnimalRead])
async def cargas_animales(
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> list[CargaAnimalRead]:
    """IND-05/IND-06: carga animal y semáforo de ocupación para todos los potreros activos."""
    items, _ = await crud.list_by_establecimiento(db, establecimiento_id, estado="activo", limit=100, offset=0)
    return [await svc_potreros.calcular_carga(db, p) for p in items]


@router.get("/{potrero_id}", response_model=PotreroRead)
async def get_potrero(
    potrero_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> PotreroRead:
    potrero = await crud.get_by_id(db, potrero_id, establecimiento_id)
    if not potrero:
        raise HTTPException(status_code=404, detail="Potrero no encontrado")
    return PotreroRead.model_validate(potrero)


@router.get("/{potrero_id}/carga", response_model=CargaAnimalRead)
async def carga_animal_potrero(
    potrero_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> CargaAnimalRead:
    """IND-05/IND-06: carga animal y semáforo de ocupación para un potrero específico."""
    potrero = await crud.get_by_id(db, potrero_id, establecimiento_id)
    if not potrero:
        raise HTTPException(status_code=404, detail="Potrero no encontrado")
    return await svc_potreros.calcular_carga(db, potrero)


@router.patch("/{potrero_id}", response_model=PotreroRead)
async def actualizar_potrero(
    potrero_id: uuid.UUID,
    data: PotreroUpdate,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> PotreroRead:
    potrero = await crud.get_by_id(db, potrero_id, establecimiento_id)
    if not potrero:
        raise HTTPException(status_code=404, detail="Potrero no encontrado")
    potrero = await crud.update(db, potrero, data)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe un potrero con ese nombre")
    return PotreroRead.model_validate(potrero)
