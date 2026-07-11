import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_establecimiento_id, get_db
from app.crud import categorias as crud
from app.schemas.categorias import CategoriaRead, CategoriaUpdate

router = APIRouter(prefix="/categorias", tags=["categorias"])


@router.get("", response_model=list[CategoriaRead])
async def list_categorias(
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> list[CategoriaRead]:
    items = await crud.list_by_establecimiento(db, establecimiento_id)
    return [CategoriaRead.model_validate(c) for c in items]


@router.patch("/{categoria_id}", response_model=CategoriaRead)
async def actualizar_coeficiente_ug(
    categoria_id: uuid.UUID,
    data: CategoriaUpdate,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> CategoriaRead:
    categoria = await crud.get_by_id(db, categoria_id, establecimiento_id)
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    categoria = await crud.update_coeficiente(db, categoria, data.coeficiente_ug)
    await db.commit()
    return CategoriaRead.model_validate(categoria)
