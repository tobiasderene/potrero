import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.categorias import Categoria

_COEFICIENTES_UG_DEFECTO: dict[str, Decimal] = {
    "ternero": Decimal("0.30"),
    "ternera": Decimal("0.30"),
    "novillo": Decimal("0.70"),
    "vaquillona": Decimal("0.70"),
    "vaca": Decimal("1.00"),
    "vaca_con_cria": Decimal("1.20"),
    "toro": Decimal("1.20"),
    "buey": Decimal("1.00"),
}


async def seed_para_establecimiento(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
) -> list[Categoria]:
    categorias = [
        Categoria(
            establecimiento_id=establecimiento_id,
            nombre=nombre,
            coeficiente_ug=coef,
        )
        for nombre, coef in _COEFICIENTES_UG_DEFECTO.items()
    ]
    db.add_all(categorias)
    await db.flush()
    return categorias


async def list_by_establecimiento(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
) -> list[Categoria]:
    result = await db.execute(
        select(Categoria)
        .where(
            Categoria.establecimiento_id == establecimiento_id,
            Categoria.activo == True,
        )
        .order_by(Categoria.nombre)
    )
    return list(result.scalars().all())


async def get_by_id(
    db: AsyncSession,
    categoria_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
) -> Categoria | None:
    result = await db.execute(
        select(Categoria).where(
            Categoria.id == categoria_id,
            Categoria.establecimiento_id == establecimiento_id,
        )
    )
    return result.scalar_one_or_none()


async def update_coeficiente(
    db: AsyncSession,
    categoria: Categoria,
    coeficiente_ug: Decimal,
) -> Categoria:
    categoria.coeficiente_ug = coeficiente_ug
    categoria.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return categoria
