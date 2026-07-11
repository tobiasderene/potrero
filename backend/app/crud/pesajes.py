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
    """Compara los 2 últimos pesajes lote_estimado del lote (1 por fecha). Devuelve (gdp_g_dia, dias_intervalo)."""
    # DISTINCT ON fecha_evento para que varios pesajes del mismo día no rompan el cálculo.
    result = await db.execute(
        text("""
            SELECT peso_kg, fecha_evento
            FROM (
                SELECT DISTINCT ON (e.fecha_evento)
                    ep.peso_kg, e.fecha_evento
                FROM evento_pesajes ep
                JOIN eventos e ON e.id = ep.evento_id
                WHERE ep.lote_id = CAST(:lote_id AS UUID)
                  AND ep.tipo = 'lote_estimado'
                  AND e.anulado = FALSE
                ORDER BY e.fecha_evento DESC, e.fecha_registro DESC
            ) t
            LIMIT 2
        """),
        {"lote_id": str(lote_id)},
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


async def anular_pesaje(
    db: AsyncSession,
    evento_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
) -> Evento | None:
    result = await db.execute(
        select(Evento).where(
            Evento.id == evento_id,
            Evento.establecimiento_id == establecimiento_id,
            Evento.tipo == "pesaje",
        )
    )
    evento = result.scalar_one_or_none()
    if evento is None:
        return None
    await db.execute(
        text("UPDATE eventos SET anulado = TRUE WHERE id = CAST(:eid AS UUID)"),
        {"eid": str(evento_id)},
    )
    return evento


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


async def get_animales_potrero_activos(
    db: AsyncSession,
    potrero_id: uuid.UUID,
) -> list[uuid.UUID]:
    from app.models.animales import Animal
    result = await db.execute(
        select(Animal.id).where(
            Animal.potrero_actual_id == potrero_id,
            Animal.estado == "activo",
        )
    )
    return [row.id for row in result]


async def get_lotes_potrero_activos(
    db: AsyncSession,
    potrero_id: uuid.UUID,
) -> list[uuid.UUID]:
    """Devuelve los lote_actual_id distintos de animales activos en el potrero."""
    from sqlalchemy import distinct
    from app.models.animales import Animal
    result = await db.execute(
        select(distinct(Animal.lote_actual_id)).where(
            Animal.potrero_actual_id == potrero_id,
            Animal.estado == "activo",
            Animal.lote_actual_id.is_not(None),
        )
    )
    return [row[0] for row in result]
