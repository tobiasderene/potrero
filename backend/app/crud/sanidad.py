import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.eventos import Evento, EventoAnimal, EventoVacunacion, EventoTratamiento, EventoDiagnostico
from app.models.animales import Animal


async def create_vacunacion(
    db: AsyncSession,
    evento_id: uuid.UUID,
    biologico: str,
    lote_id: uuid.UUID | None = None,
    laboratorio: str | None = None,
    numero_lote_biologico: str | None = None,
    fecha_vencimiento_biol: date | None = None,
    dosis_ml: Decimal | None = None,
    via_administracion: str | None = None,
    es_antiaftosa: bool = False,
) -> EventoVacunacion:
    ev = EventoVacunacion(
        evento_id=evento_id,
        biologico=biologico,
        lote_id=lote_id,
        laboratorio=laboratorio,
        numero_lote_biologico=numero_lote_biologico,
        fecha_vencimiento_biol=fecha_vencimiento_biol,
        dosis_ml=dosis_ml,
        via_administracion=via_administracion,
        es_antiaftosa=es_antiaftosa,
    )
    db.add(ev)
    await db.flush()
    return ev


async def create_tratamiento(
    db: AsyncSession,
    evento_id: uuid.UUID,
    animal_id: uuid.UUID,
    medicamento: str,
    fecha_fin_carencia: date,
    dias_carencia: int,
    diagnostico: str | None = None,
    dosis: str | None = None,
    via_administracion: str | None = None,
    duracion_dias: int | None = None,
    veterinario: str | None = None,
    costo: Decimal | None = None,
    moneda_costo: str | None = None,
) -> EventoTratamiento:
    et = EventoTratamiento(
        evento_id=evento_id,
        animal_id=animal_id,
        medicamento=medicamento,
        fecha_fin_carencia=fecha_fin_carencia,
        dias_carencia=dias_carencia,
        diagnostico=diagnostico,
        dosis=dosis,
        via_administracion=via_administracion,
        duracion_dias=duracion_dias,
        veterinario=veterinario,
        costo=costo,
        moneda_costo=moneda_costo,
    )
    db.add(et)
    await db.flush()
    return et


async def create_diagnostico(
    db: AsyncSession,
    evento_id: uuid.UUID,
    animal_id: uuid.UUID,
    descripcion: str,
    veterinario: str | None = None,
    con_tratamiento: bool = False,
) -> EventoDiagnostico:
    ed = EventoDiagnostico(
        evento_id=evento_id,
        animal_id=animal_id,
        descripcion=descripcion,
        veterinario=veterinario,
        con_tratamiento=con_tratamiento,
    )
    db.add(ed)
    await db.flush()
    return ed


async def get_carencias_activas(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
) -> list[tuple]:
    """Devuelve animales activos con carencia vigente."""
    result = await db.execute(
        text("""
            SELECT
                a.id               AS animal_id,
                a.caravana_senacsa,
                a.numero_campo,
                max(et.fecha_fin_carencia)       AS fecha_fin_carencia,
                string_agg(et.medicamento, ', ') AS medicamento
            FROM evento_tratamientos et
            JOIN eventos e ON e.id = et.evento_id
            JOIN animales a ON a.id = et.animal_id
            WHERE a.establecimiento_id = :est_id
              AND a.estado = 'activo'
              AND et.fecha_fin_carencia >= CURRENT_DATE
              AND e.anulado = FALSE
            GROUP BY a.id, a.caravana_senacsa, a.numero_campo
            HAVING max(et.fecha_fin_carencia) >= CURRENT_DATE
            ORDER BY max(et.fecha_fin_carencia) ASC
        """),
        {"est_id": str(establecimiento_id)},
    )
    return list(result.all())


async def get_proximas_antiaftosa(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    dias_alerta: int = 60,
) -> list[tuple]:
    """Animales activos con antiaftosa próxima a vencer o sin registro."""
    result = await db.execute(
        text("""
            WITH ultima_antiaftosa AS (
                SELECT
                    ea.animal_id,
                    max(e.fecha_evento) AS ultima_fecha
                FROM eventos_animales ea
                JOIN eventos e ON e.id = ea.evento_id
                JOIN evento_vacunaciones ev ON ev.evento_id = e.id
                WHERE e.establecimiento_id = :est_id
                  AND ev.es_antiaftosa = TRUE
                  AND e.anulado = FALSE
                GROUP BY ea.animal_id
            )
            SELECT
                a.id               AS animal_id,
                a.caravana_senacsa,
                a.numero_campo,
                ua.ultima_fecha    AS ultima_antiaftosa,
                (ua.ultima_fecha + INTERVAL '180 days')::DATE AS proxima_estimada,
                ((ua.ultima_fecha + INTERVAL '180 days')::DATE - CURRENT_DATE)::INTEGER AS dias_para_vencimiento
            FROM animales a
            LEFT JOIN ultima_antiaftosa ua ON ua.animal_id = a.id
            WHERE a.establecimiento_id = :est_id
              AND a.estado = 'activo'
              AND (
                  ua.ultima_fecha IS NULL
                  OR (ua.ultima_fecha + INTERVAL '180 days')::DATE <= CURRENT_DATE + :dias_alerta
              )
            ORDER BY proxima_estimada ASC NULLS FIRST
            LIMIT 100
        """),
        {"est_id": str(establecimiento_id), "dias_alerta": dias_alerta},
    )
    return list(result.all())


async def get_animales_activos_lote(
    db: AsyncSession,
    lote_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
) -> list[Animal]:
    result = await db.execute(
        select(Animal).where(
            Animal.lote_actual_id == lote_id,
            Animal.establecimiento_id == establecimiento_id,
            Animal.estado == "activo",
        )
    )
    return list(result.scalars().all())


async def get_tratamientos_animal(
    db: AsyncSession,
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
    limit: int = 20,
) -> list[tuple[Evento, EventoTratamiento]]:
    result = await db.execute(
        select(Evento, EventoTratamiento)
        .join(EventoTratamiento, EventoTratamiento.evento_id == Evento.id)
        .where(
            Evento.establecimiento_id == establecimiento_id,
            EventoTratamiento.animal_id == animal_id,
            Evento.anulado.is_(False),
        )
        .order_by(Evento.fecha_evento.desc())
        .limit(limit)
    )
    return list(result.all())


async def get_vacunaciones_animal(
    db: AsyncSession,
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
    limit: int = 20,
) -> list[tuple[Evento, EventoVacunacion]]:
    result = await db.execute(
        select(Evento, EventoVacunacion)
        .join(EventoVacunacion, EventoVacunacion.evento_id == Evento.id)
        .join(EventoAnimal, (EventoAnimal.evento_id == Evento.id) & (EventoAnimal.animal_id == animal_id))
        .where(
            Evento.establecimiento_id == establecimiento_id,
            Evento.anulado.is_(False),
        )
        .order_by(Evento.fecha_evento.desc())
        .limit(limit)
    )
    return list(result.all())
