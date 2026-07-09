import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.eventos import Evento, EventoAnimal, EventoPesaje


async def create_pesaje(
    db: AsyncSession,
    evento_id: uuid.UUID,
    tipo: str,
    peso_kg: Decimal,
    animal_id: uuid.UUID | None = None,
    lote_id: uuid.UUID | None = None,
    cantidad_muestra: int | None = None,
    gdp_g_dia: Decimal | None = None,
    dias_intervalo: int | None = None,
) -> EventoPesaje:
    ep = EventoPesaje(
        evento_id=evento_id,
        tipo=tipo,
        peso_kg=peso_kg,
        animal_id=animal_id,
        lote_id=lote_id,
        cantidad_muestra=cantidad_muestra,
        gdp_g_dia=gdp_g_dia,
        dias_intervalo=dias_intervalo,
    )
    db.add(ep)
    await db.flush()
    return ep


async def calcular_gdp_db(
    db: AsyncSession,
    animal_id: uuid.UUID,
) -> tuple[Decimal | None, Decimal | None, int | None]:
    """Llama a la SQL function calcular_gdp(). Devuelve (gdp_g_dia, peso_anterior, dias_intervalo)."""
    result = await db.execute(
        text("SELECT gdp_g_dia, peso_anterior, dias_intervalo FROM calcular_gdp(CAST(:aid AS UUID))"),
        {"aid": str(animal_id)},
    )
    row = result.one_or_none()
    if row is None:
        return None, None, None
    return row.gdp_g_dia, row.peso_anterior, row.dias_intervalo


async def get_pesajes_animal(
    db: AsyncSession,
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
    limit: int = 50,
) -> list[tuple[Evento, EventoPesaje]]:
    result = await db.execute(
        select(Evento, EventoPesaje)
        .join(EventoPesaje, EventoPesaje.evento_id == Evento.id)
        .where(
            Evento.establecimiento_id == establecimiento_id,
            EventoPesaje.animal_id == animal_id,
            EventoPesaje.tipo == "individual",
            Evento.anulado.is_(False),
        )
        .order_by(Evento.fecha_evento.desc())
        .limit(limit)
    )
    return list(result.all())


async def get_pesajes_lote(
    db: AsyncSession,
    lote_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
    limit: int = 50,
) -> list[tuple[Evento, EventoPesaje]]:
    result = await db.execute(
        select(Evento, EventoPesaje)
        .join(EventoPesaje, EventoPesaje.evento_id == Evento.id)
        .where(
            Evento.establecimiento_id == establecimiento_id,
            EventoPesaje.lote_id == lote_id,
            EventoPesaje.tipo == "lote_estimado",
            Evento.anulado.is_(False),
        )
        .order_by(Evento.fecha_evento.desc())
        .limit(limit)
    )
    return list(result.all())


async def calcular_gdp_lote_estimado(
    db: AsyncSession,
    lote_id: uuid.UUID,
) -> tuple[Decimal | None, int | None]:
    """Compara los 2 últimos pesajes lote_estimado del lote. Devuelve (gdp_g_dia, dias_intervalo)."""
    result = await db.execute(
        select(EventoPesaje.peso_kg, Evento.fecha_evento)
        .join(Evento, Evento.id == EventoPesaje.evento_id)
        .where(
            EventoPesaje.lote_id == lote_id,
            EventoPesaje.tipo == "lote_estimado",
            Evento.anulado.is_(False),
        )
        .order_by(Evento.fecha_evento.desc())
        .limit(2)
    )
    rows = result.all()
    if len(rows) < 2:
        return None, None
    peso_actual, fecha_actual = rows[0]
    peso_anterior, fecha_anterior = rows[1]
    dias = (fecha_actual - fecha_anterior).days
    if dias <= 0:
        return None, None
    gdp = round(
        (Decimal(str(peso_actual)) - Decimal(str(peso_anterior))) / Decimal(dias) * 1000,
        2,
    )
    return gdp, dias


async def get_animales_lote_activos(
    db: AsyncSession,
    lote_id: uuid.UUID,
) -> list[uuid.UUID]:
    from app.models.animales import Animal
    result = await db.execute(
        select(Animal.id).where(
            Animal.lote_actual_id == lote_id,
            Animal.estado == "activo",
        )
    )
    return [row.id for row in result]
