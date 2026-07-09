import base64
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import func, select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.animales import Animal, AnimalCategoria
from app.models.lotes import Lote
from app.models.potreros import Potrero
from app.schemas.animales import AnimalCreate, AnimalUpdate


async def create(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: AnimalCreate,
    user_id: uuid.UUID,
) -> Animal:
    animal = Animal(
        establecimiento_id=establecimiento_id,
        caravana_senacsa=data.caravana_senacsa,
        numero_campo=data.numero_campo,
        sexo=data.sexo,
        tipo_origen=data.tipo_origen,
        raza=data.raza,
        fecha_nacimiento=data.fecha_nacimiento,
        fecha_nacimiento_estimada=data.fecha_nacimiento_estimada,
        establecimiento_origen=data.establecimiento_origen,
        potrero_actual_id=data.potrero_id,
    )
    db.add(animal)
    await db.flush()

    cat = AnimalCategoria(
        animal_id=animal.id,
        categoria=data.categoria,
        fecha_inicio=date.today(),
        usuario_id=user_id,
    )
    db.add(cat)
    await db.flush()

    return animal


async def get_by_id(
    db: AsyncSession,
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
) -> Animal | None:
    result = await db.execute(
        select(Animal).where(
            Animal.id == animal_id,
            Animal.establecimiento_id == establecimiento_id,
        )
    )
    return result.scalar_one_or_none()


async def list_with_filters(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    caravana: str | None = None,
    numero_campo: str | None = None,
    categoria_filter: str | None = None,
    potrero_id: uuid.UUID | None = None,
    estado: str | None = "activo",
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Animal], int]:
    base = select(Animal).where(Animal.establecimiento_id == establecimiento_id)

    if estado:
        base = base.where(Animal.estado == estado)
    if caravana:
        base = base.where(Animal.caravana_senacsa.ilike(f"%{caravana}%"))
    if numero_campo:
        base = base.where(Animal.numero_campo.ilike(f"%{numero_campo}%"))
    if potrero_id:
        base = base.where(Animal.potrero_actual_id == potrero_id)
    if categoria_filter:
        subq = (
            select(AnimalCategoria.animal_id)
            .where(AnimalCategoria.categoria == categoria_filter, AnimalCategoria.fecha_fin.is_(None))
            .scalar_subquery()
        )
        base = base.where(Animal.id.in_(subq))

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
    items = list(
        (await db.execute(base.order_by(Animal.caravana_senacsa.nulls_last(), Animal.numero_campo).limit(limit).offset(offset))).scalars().all()
    )
    return items, total


def _encode_cursor(created_at: datetime, animal_id: uuid.UUID) -> str:
    payload = f"{created_at.isoformat()}|{animal_id}"
    return base64.b64encode(payload.encode()).decode()


def _decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    payload = base64.b64decode(cursor.encode()).decode()
    dt_str, id_str = payload.split("|", 1)
    return datetime.fromisoformat(dt_str), uuid.UUID(id_str)


async def get_lotes_nombres(
    db: AsyncSession,
    lote_ids: list[uuid.UUID],
) -> dict[uuid.UUID, str]:
    if not lote_ids:
        return {}
    result = await db.execute(
        select(Lote.id, Lote.nombre).where(Lote.id.in_(lote_ids))
    )
    return {row.id: row.nombre for row in result}


async def get_potreros_nombres(
    db: AsyncSession,
    potrero_ids: list[uuid.UUID],
) -> dict[uuid.UUID, str]:
    if not potrero_ids:
        return {}
    result = await db.execute(
        select(Potrero.id, Potrero.nombre).where(Potrero.id.in_(potrero_ids))
    )
    return {row.id: row.nombre for row in result}


async def list_with_cursor(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    caravana: str | None = None,
    numero_campo: str | None = None,
    categoria_filter: str | None = None,
    potrero_id: uuid.UUID | None = None,
    lote_id: uuid.UUID | None = None,
    estado: str | None = "activo",
    limit: int = 20,
    cursor: str | None = None,
) -> tuple[list[Animal], int, str | None]:
    base = select(Animal).where(Animal.establecimiento_id == establecimiento_id)

    if estado:
        base = base.where(Animal.estado == estado)
    if caravana:
        base = base.where(Animal.caravana_senacsa.ilike(f"%{caravana}%"))
    if numero_campo:
        base = base.where(Animal.numero_campo.ilike(f"%{numero_campo}%"))
    if potrero_id:
        base = base.where(Animal.potrero_actual_id == potrero_id)
    if lote_id:
        base = base.where(Animal.lote_actual_id == lote_id)
    if categoria_filter:
        subq = (
            select(AnimalCategoria.animal_id)
            .where(AnimalCategoria.categoria == categoria_filter, AnimalCategoria.fecha_fin.is_(None))
            .scalar_subquery()
        )
        base = base.where(Animal.id.in_(subq))

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0

    if cursor:
        cursor_dt, cursor_id = _decode_cursor(cursor)
        base = base.where(tuple_(Animal.created_at, Animal.id) > (cursor_dt, cursor_id))

    items = list(
        (await db.execute(
            base.order_by(Animal.created_at.asc(), Animal.id.asc()).limit(limit)
        )).scalars().all()
    )

    next_cursor = None
    if len(items) == limit:
        last = items[-1]
        next_cursor = _encode_cursor(last.created_at, last.id)

    return items, total, next_cursor


async def get_categorias_actuales(
    db: AsyncSession,
    animal_ids: list[uuid.UUID],
) -> dict[uuid.UUID, str]:
    if not animal_ids:
        return {}
    result = await db.execute(
        select(AnimalCategoria.animal_id, AnimalCategoria.categoria).where(
            AnimalCategoria.animal_id.in_(animal_ids),
            AnimalCategoria.fecha_fin.is_(None),
        )
    )
    return {row.animal_id: row.categoria for row in result}


async def cambiar_categoria(
    db: AsyncSession,
    animal: Animal,
    nueva_categoria: str,
    user_id: uuid.UUID,
) -> AnimalCategoria:
    actual = (await db.execute(
        select(AnimalCategoria).where(
            AnimalCategoria.animal_id == animal.id,
            AnimalCategoria.fecha_fin.is_(None),
        )
    )).scalar_one_or_none()

    hoy = date.today()
    if actual:
        actual.fecha_fin = hoy
        await db.flush()

    nueva = AnimalCategoria(
        animal_id=animal.id,
        categoria=nueva_categoria,
        fecha_inicio=hoy,
        usuario_id=user_id,
    )
    db.add(nueva)
    await db.flush()
    return nueva


async def update(db: AsyncSession, animal: Animal, data: AnimalUpdate) -> Animal:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(animal, field, value)
    animal.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return animal
