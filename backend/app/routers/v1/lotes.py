import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_establecimiento_id, get_db
from app.crud import lotes as crud
from app.schemas.common import Paginated
from app.schemas.lotes import AsignarAnimalesInput, LoteCreate, LoteRead, LoteUpdate
from app.services import lotes as svc

router = APIRouter(prefix="/lotes", tags=["lotes"])


@router.get("", response_model=Paginated[LoteRead])
async def list_lotes(
    estado: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> Paginated[LoteRead]:
    items, total = await crud.list_by_establecimiento(
        db, establecimiento_id, estado=estado, limit=limit, offset=offset
    )
    reads = [await svc.build_lote_read(db, lote) for lote in items]
    return Paginated(items=reads, total=total, limit=limit, offset=offset)


@router.post("", response_model=LoteRead, status_code=status.HTTP_201_CREATED)
async def crear_lote(
    data: LoteCreate,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> LoteRead:
    lote = await svc.crear_lote(db, establecimiento_id, data)
    return await svc.build_lote_read(db, lote)


@router.get("/{lote_id}", response_model=LoteRead)
async def get_lote(
    lote_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> LoteRead:
    from fastapi import HTTPException
    lote = await crud.get_by_id(db, lote_id, establecimiento_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return await svc.build_lote_read(db, lote)


@router.patch("/{lote_id}", response_model=LoteRead)
async def actualizar_lote(
    lote_id: uuid.UUID,
    data: LoteUpdate,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> LoteRead:
    lote = await svc.actualizar_lote(db, lote_id, establecimiento_id, data)
    return await svc.build_lote_read(db, lote)


@router.post("/{lote_id}/animales", status_code=status.HTTP_200_OK)
async def asignar_animales(
    lote_id: uuid.UUID,
    data: AsignarAnimalesInput,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Asigna animales al lote (RN-03: mueve automáticamente del lote anterior)."""
    assigned = await svc.asignar_animales(db, lote_id, establecimiento_id, data.animal_ids)
    return {"asignados": len(assigned), "animal_ids": [str(aid) for aid in assigned]}


@router.get("/{lote_id}/animales")
async def get_animales_del_lote(
    lote_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.crud.animales import get_categorias_actuales
    from app.schemas.animales import AnimalRead
    from fastapi import HTTPException

    lote = await crud.get_by_id(db, lote_id, establecimiento_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")

    animales = await crud.get_animales(db, lote_id, establecimiento_id)
    cats = await get_categorias_actuales(db, [a.id for a in animales])
    items = []
    for a in animales:
        r = AnimalRead.model_validate(a)
        r.categoria_actual = cats.get(a.id)
        items.append(r)
    return {"items": items, "total": len(items)}
