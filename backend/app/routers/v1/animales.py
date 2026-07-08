import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_establecimiento_id, get_db
from app.crud import animales as crud
from app.schemas.animales import AnimalCreate, AnimalRead, AnimalUpdate
from app.schemas.common import Paginated
from app.services import animales as svc

router = APIRouter(prefix="/animales", tags=["animales"])


def _with_categoria(animal, cats: dict) -> AnimalRead:
    r = AnimalRead.model_validate(animal)
    r.categoria_actual = cats.get(animal.id)
    return r


@router.get("", response_model=Paginated[AnimalRead])
async def list_animales(
    caravana: str | None = None,
    numero_campo: str | None = None,
    categoria: str | None = None,
    potrero_id: uuid.UUID | None = None,
    estado: str | None = Query(default="activo"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> Paginated[AnimalRead]:
    animals, total = await crud.list_with_filters(
        db, establecimiento_id,
        caravana=caravana,
        numero_campo=numero_campo,
        categoria_filter=categoria,
        potrero_id=potrero_id,
        estado=estado,
        limit=limit,
        offset=offset,
    )
    cats = await crud.get_categorias_actuales(db, [a.id for a in animals])
    return Paginated(
        items=[_with_categoria(a, cats) for a in animals],
        total=total,
        limit=limit,
        offset=offset,
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
