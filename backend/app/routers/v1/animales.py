import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_establecimiento_id, get_db
from app.crud import animales as crud
from app.schemas.animales import AnimalCreate, AnimalRead, AnimalUpdate, CambioCategoria
from app.schemas.common import PaginatedCursor
from app.services import animales as svc

router = APIRouter(prefix="/animales", tags=["animales"])


def _with_enrichment(animal, cats: dict, lotes: dict) -> AnimalRead:
    r = AnimalRead.model_validate(animal)
    r.categoria_actual = cats.get(animal.id)
    r.lote_actual_nombre = lotes.get(animal.lote_actual_id) if animal.lote_actual_id else None
    return r


@router.get("", response_model=PaginatedCursor[AnimalRead])
async def list_animales(
    caravana: str | None = None,
    numero_campo: str | None = None,
    categoria: str | None = None,
    potrero_id: uuid.UUID | None = None,
    lote_id: uuid.UUID | None = None,
    estado: str | None = Query(default="activo"),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = None,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> PaginatedCursor[AnimalRead]:
    animals, total, next_cursor = await crud.list_with_cursor(
        db, establecimiento_id,
        caravana=caravana,
        numero_campo=numero_campo,
        categoria_filter=categoria,
        potrero_id=potrero_id,
        lote_id=lote_id,
        estado=estado,
        limit=limit,
        cursor=cursor,
    )
    lote_ids = [a.lote_actual_id for a in animals if a.lote_actual_id]
    cats, lotes = await asyncio.gather(
        crud.get_categorias_actuales(db, [a.id for a in animals]),
        crud.get_lotes_nombres(db, lote_ids),
    )
    return PaginatedCursor(
        items=[_with_enrichment(a, cats, lotes) for a in animals],
        total=total,
        limit=limit,
        next_cursor=next_cursor,
        has_next=next_cursor is not None,
    )


@router.post("", response_model=AnimalRead, status_code=status.HTTP_201_CREATED)
async def crear_animal(
    data: AnimalCreate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> AnimalRead:
    animal = await svc.crear_animal(db, establecimiento_id, data, user_id)
    r = AnimalRead.model_validate(animal)
    r.categoria_actual = data.categoria
    return r


@router.get("/{animal_id}", response_model=AnimalRead)
async def get_animal(
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> AnimalRead:
    animal = await crud.get_by_id(db, animal_id, establecimiento_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Animal no encontrado")
    cats = await crud.get_categorias_actuales(db, [animal_id])
    return _with_categoria(animal, cats)


@router.post("/{animal_id}/categoria", response_model=AnimalRead)
async def cambiar_categoria(
    animal_id: uuid.UUID,
    data: CambioCategoria,
    user_id: uuid.UUID = Depends(get_current_user_id),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> AnimalRead:
    animal = await svc.cambiar_categoria_animal(db, animal_id, establecimiento_id, data, user_id)
    cats = await crud.get_categorias_actuales(db, [animal_id])
    return _with_categoria(animal, cats)


@router.patch("/{animal_id}", response_model=AnimalRead)
async def actualizar_animal(
    animal_id: uuid.UUID,
    data: AnimalUpdate,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> AnimalRead:
    animal = await svc.actualizar_animal(db, animal_id, establecimiento_id, data)
    cats = await crud.get_categorias_actuales(db, [animal_id])
    return _with_categoria(animal, cats)
