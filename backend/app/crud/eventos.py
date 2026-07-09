import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.eventos import Evento, EventoAnimal, EventoMovimiento, EventoEconomico


async def create_evento(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    tipo: str,
    fecha_evento: date,
    usuario_id: uuid.UUID,
    observaciones: str | None = None,
) -> Evento:
    evento = Evento(
        establecimiento_id=establecimiento_id,
        tipo=tipo,
        fecha_evento=fecha_evento,
        usuario_id=usuario_id,
        observaciones=observaciones,
    )
    db.add(evento)
    await db.flush()
    return evento


async def create_eventos_animales(
    db: AsyncSession,
    evento_id: uuid.UUID,
    animal_ids: list[uuid.UUID],
) -> None:
    for animal_id in animal_ids:
        ea = EventoAnimal(evento_id=evento_id, animal_id=animal_id)
        db.add(ea)
    await db.flush()


async def create_evento_movimiento(
    db: AsyncSession,
    evento_id: uuid.UUID,
    tipo_movimiento: str,
    **kwargs,
) -> EventoMovimiento:
    em = EventoMovimiento(evento_id=evento_id, tipo_movimiento=tipo_movimiento, **kwargs)
    db.add(em)
    await db.flush()
    return em


async def create_evento_economico(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    evento_id: uuid.UUID,
    tipo: str,
    monto,
    moneda: str,
    animal_id: uuid.UUID | None = None,
    lote_id: uuid.UUID | None = None,
    descripcion: str | None = None,
) -> EventoEconomico:
    ee = EventoEconomico(
        establecimiento_id=establecimiento_id,
        evento_id=evento_id,
        animal_id=animal_id,
        lote_id=lote_id,
        tipo=tipo,
        monto=monto,
        moneda=moneda,
        descripcion=descripcion,
    )
    db.add(ee)
    await db.flush()
    return ee


async def get_evento_movimiento(
    db: AsyncSession,
    evento_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
) -> tuple[Evento, EventoMovimiento, list[uuid.UUID]] | None:
    ev_res = await db.execute(
        select(Evento).where(
            Evento.id == evento_id,
            Evento.establecimiento_id == establecimiento_id,
        )
    )
    evento = ev_res.scalar_one_or_none()
    if not evento:
        return None

    em_res = await db.execute(
        select(EventoMovimiento).where(EventoMovimiento.evento_id == evento_id)
    )
    em = em_res.scalar_one_or_none()
    if not em:
        return None

    ea_res = await db.execute(
        select(EventoAnimal.animal_id).where(EventoAnimal.evento_id == evento_id)
    )
    animal_ids = [row.animal_id for row in ea_res]
    return evento, em, animal_ids
