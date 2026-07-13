import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_establecimiento_id
from app.models.animales import Animal
from app.models.categorias import Categoria
from app.models.lotes import Lote
from app.models.potreros import Potrero
from app.schemas.onboarding import OnboardingProgreso

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get("/progreso", response_model=OnboardingProgreso)
async def get_progreso(
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> OnboardingProgreso:
    import asyncio

    async def count(model, extra=None):
        q = select(func.count()).select_from(model).where(
            model.establecimiento_id == establecimiento_id
        )
        if extra is not None:
            q = q.where(extra)
        return (await db.execute(q)).scalar_one()

    n_potreros, n_cats, n_lotes, n_animales = await asyncio.gather(
        count(Potrero),
        count(Categoria),
        count(Lote),
        count(Animal, Animal.estado == "activo"),
    )

    items = [n_potreros > 0, n_cats > 0, n_lotes > 0, n_animales > 0]
    porcentaje = int(sum(items) / len(items) * 100)

    return OnboardingProgreso(
        tiene_potreros=n_potreros > 0,
        tiene_categorias=n_cats > 0,
        tiene_lotes=n_lotes > 0,
        tiene_animales=n_animales > 0,
        porcentaje=porcentaje,
    )
