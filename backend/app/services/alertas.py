"""Alertas Nivel 1 del Centro de Decisiones — 8 alertas MVP."""

import uuid
from datetime import date

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.alertas import AlertaRead, AlertasResponse

_LIMIT_PER_TYPE = 20


def _label(caravana: str | None, campo: str | None) -> str:
    return caravana or campo or "Sin ID"


async def get_alertas(
    db: AsyncSession, establecimiento_id: uuid.UUID
) -> AlertasResponse:
    est = str(establecimiento_id)
    today = date.today()

    alertas: list[AlertaRead] = []

    alertas += await _alerta_carencia_activa(db, est, today)
    alertas += await _alerta_antiaftosa_vencida(db, est, today)
    alertas += await _alerta_gdp_negativo(db, est)
    alertas += await _alerta_potrero_sobrecargado(db, est)
    alertas += await _alerta_vacunacion_proxima(db, est, today)
    alertas += await _alerta_sin_pesaje_invernada(db, est, today)
    alertas += await _alerta_lote_invernada_sin_gdp(db, est)
    alertas += await _alerta_animal_sin_categoria(db, est)

    orden = {"critica": 0, "alta": 1, "media": 2}
    alertas.sort(key=lambda a: orden[a.severidad])

    return AlertasResponse(
        total=len(alertas),
        total_criticas=sum(1 for a in alertas if a.severidad == "critica"),
        total_altas=sum(1 for a in alertas if a.severidad == "alta"),
        total_medias=sum(1 for a in alertas if a.severidad == "media"),
        alertas=alertas,
    )


async def _alerta_carencia_activa(
    db: AsyncSession, est: str, today: date
) -> list[AlertaRead]:
    """RN-06: animales con carencia activa — crítica porque bloquean venta."""
    result = await db.execute(
        text("""
            SELECT
                a.id,
                a.caravana_senacsa,
                a.numero_campo,
                a.potrero_actual_id,
                MAX(et.fecha_fin_carencia) AS fecha_fin,
                STRING_AGG(et.medicamento, ', ') AS medicamentos
            FROM evento_tratamientos et
            JOIN eventos e ON e.id = et.evento_id
            JOIN animales a ON a.id = et.animal_id
            WHERE a.establecimiento_id = :est_id
              AND a.estado = 'activo'
              AND et.fecha_fin_carencia >= CURRENT_DATE
              AND e.anulado = FALSE
            GROUP BY a.id, a.caravana_senacsa, a.numero_campo, a.potrero_actual_id
            ORDER BY MAX(et.fecha_fin_carencia) DESC
            LIMIT :lim
        """),
        {"est_id": est, "lim": _LIMIT_PER_TYPE},
    )
    rows = result.all()
    alertas = []
    for r in rows:
        dias = (r.fecha_fin - today).days
        alertas.append(AlertaRead(
            tipo="carencia_activa",
            severidad="critica",
            entidad_tipo="animal",
            entidad_id=r.id,
            entidad_label=_label(r.caravana_senacsa, r.numero_campo),
            mensaje=f"Carencia activa por {r.medicamentos} — vence en {dias} día{'s' if dias != 1 else ''}. Venta bloqueada.",
            potrero_id=r.potrero_actual_id,
        ))
    return alertas


async def _alerta_antiaftosa_vencida(
    db: AsyncSession, est: str, today: date
) -> list[AlertaRead]:
    """IND-14: animales con antiaftosa vencida (>180 días) o sin registro."""
    result = await db.execute(
        text("""
            WITH ultima_antiaftosa AS (
                SELECT ea.animal_id, MAX(e.fecha_evento) AS ultima_fecha
                FROM eventos_animales ea
                JOIN eventos e ON e.id = ea.evento_id
                JOIN evento_vacunaciones ev ON ev.evento_id = e.id
                WHERE e.establecimiento_id = :est_id
                  AND ev.es_antiaftosa = TRUE
                  AND e.anulado = FALSE
                GROUP BY ea.animal_id
            )
            SELECT a.id, a.caravana_senacsa, a.numero_campo, a.potrero_actual_id, ua.ultima_fecha
            FROM animales a
            LEFT JOIN ultima_antiaftosa ua ON ua.animal_id = a.id
            WHERE a.establecimiento_id = :est_id
              AND a.estado = 'activo'
              AND (
                ua.ultima_fecha IS NULL
                OR (ua.ultima_fecha + INTERVAL '180 days')::DATE < CURRENT_DATE
              )
            ORDER BY ua.ultima_fecha ASC NULLS FIRST
            LIMIT :lim
        """),
        {"est_id": est, "lim": _LIMIT_PER_TYPE},
    )
    rows = result.all()
    alertas = []
    for r in rows:
        if r.ultima_fecha is None:
            msg = "Sin registro de vacunación antiaftosa."
        else:
            dias_vencida = (today - r.ultima_fecha).days - 180
            msg = f"Antiaftosa vencida hace {dias_vencida} días (última: {r.ultima_fecha})."
        alertas.append(AlertaRead(
            tipo="antiaftosa_vencida",
            severidad="alta",
            entidad_tipo="animal",
            entidad_id=r.id,
            entidad_label=_label(r.caravana_senacsa, r.numero_campo),
            mensaje=msg,
            potrero_id=r.potrero_actual_id,
        ))
    return alertas


async def _alerta_gdp_negativo(
    db: AsyncSession, est: str
) -> list[AlertaRead]:
    """Animal con GDP negativo — pérdida de peso activa."""
    result = await db.execute(
        text("""
            WITH ranked AS (
                SELECT
                    ep.animal_id,
                    ep.peso_kg,
                    e.fecha_evento,
                    ROW_NUMBER() OVER (
                        PARTITION BY ep.animal_id ORDER BY e.fecha_evento DESC
                    ) AS rn
                FROM evento_pesajes ep
                JOIN eventos e ON e.id = ep.evento_id
                JOIN animales a ON a.id = ep.animal_id
                WHERE a.establecimiento_id = :est_id
                  AND a.estado = 'activo'
                  AND ep.tipo = 'individual'
                  AND ep.animal_id IS NOT NULL
                  AND e.anulado = FALSE
            )
            SELECT
                curr.animal_id,
                a.caravana_senacsa,
                a.numero_campo,
                a.potrero_actual_id,
                ROUND(
                    (curr.peso_kg - prev.peso_kg)::NUMERIC /
                    (curr.fecha_evento - prev.fecha_evento)::NUMERIC * 1000,
                    1
                ) AS gdp
            FROM ranked curr
            JOIN ranked prev
                ON prev.animal_id = curr.animal_id AND prev.rn = 2
            JOIN animales a ON a.id = curr.animal_id
            WHERE curr.rn = 1
              AND (curr.fecha_evento - prev.fecha_evento) > 0
              AND curr.peso_kg < prev.peso_kg
            ORDER BY gdp ASC
            LIMIT :lim
        """),
        {"est_id": est, "lim": _LIMIT_PER_TYPE},
    )
    return [
        AlertaRead(
            tipo="gdp_negativo",
            severidad="alta",
            entidad_tipo="animal",
            entidad_id=r.animal_id,
            entidad_label=_label(r.caravana_senacsa, r.numero_campo),
            mensaje=f"GDP negativo: {r.gdp} g/día. El animal está perdiendo peso.",
            potrero_id=r.potrero_actual_id,
        )
        for r in result.all()
    ]


async def _alerta_potrero_sobrecargado(
    db: AsyncSession, est: str
) -> list[AlertaRead]:
    """IND-06: potreros con carga > 110% de su capacidad."""
    result = await db.execute(
        text("""
            SELECT
                p.id,
                p.nombre,
                ROUND(
                    COALESCE(SUM(cat.coeficiente_ug), 0) /
                    (p.superficie_ha * p.capacidad_max_ug_ha) * 100,
                    1
                ) AS porcentaje
            FROM potreros p
            LEFT JOIN animales a
                ON a.potrero_actual_id = p.id AND a.estado = 'activo'
            LEFT JOIN animal_categorias ac
                ON ac.animal_id = a.id AND ac.fecha_fin IS NULL
            LEFT JOIN categorias cat
                ON cat.nombre = ac.categoria
               AND cat.establecimiento_id = p.establecimiento_id
            WHERE p.establecimiento_id = :est_id
              AND p.superficie_ha IS NOT NULL
              AND p.capacidad_max_ug_ha IS NOT NULL
              AND p.superficie_ha * p.capacidad_max_ug_ha > 0
            GROUP BY p.id, p.nombre, p.superficie_ha, p.capacidad_max_ug_ha
            HAVING
                COALESCE(SUM(cat.coeficiente_ug), 0) /
                (p.superficie_ha * p.capacidad_max_ug_ha) > 1.10
            ORDER BY porcentaje DESC
        """),
        {"est_id": est},
    )
    return [
        AlertaRead(
            tipo="potrero_sobrecargado",
            severidad="alta",
            entidad_tipo="potrero",
            entidad_id=r.id,
            entidad_label=r.nombre,
            mensaje=f"Potrero al {r.porcentaje}% de su capacidad (umbral: 110%).",
        )
        for r in result.all()
    ]


async def _alerta_vacunacion_proxima(
    db: AsyncSession, est: str, today: date
) -> list[AlertaRead]:
    """Antiaftosa vence en ≤ 15 días."""
    result = await db.execute(
        text("""
            WITH ultima_antiaftosa AS (
                SELECT ea.animal_id, MAX(e.fecha_evento) AS ultima_fecha
                FROM eventos_animales ea
                JOIN eventos e ON e.id = ea.evento_id
                JOIN evento_vacunaciones ev ON ev.evento_id = e.id
                WHERE e.establecimiento_id = :est_id
                  AND ev.es_antiaftosa = TRUE
                  AND e.anulado = FALSE
                GROUP BY ea.animal_id
            )
            SELECT
                a.id,
                a.caravana_senacsa,
                a.numero_campo,
                a.potrero_actual_id,
                (ua.ultima_fecha + INTERVAL '180 days')::DATE AS proxima
            FROM animales a
            JOIN ultima_antiaftosa ua ON ua.animal_id = a.id
            WHERE a.establecimiento_id = :est_id
              AND a.estado = 'activo'
              AND (ua.ultima_fecha + INTERVAL '180 days')::DATE
                  BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '15 days')::DATE
            ORDER BY proxima ASC
            LIMIT :lim
        """),
        {"est_id": est, "lim": _LIMIT_PER_TYPE},
    )
    alertas = []
    for r in result.all():
        dias = (r.proxima - today).days
        alertas.append(AlertaRead(
            tipo="vacunacion_proxima_15d",
            severidad="media",
            entidad_tipo="animal",
            entidad_id=r.id,
            entidad_label=_label(r.caravana_senacsa, r.numero_campo),
            mensaje=f"Antiaftosa vence en {dias} día{'s' if dias != 1 else ''} ({r.proxima}).",
            potrero_id=r.potrero_actual_id,
        ))
    return alertas


async def _alerta_sin_pesaje_invernada(
    db: AsyncSession, est: str, today: date
) -> list[AlertaRead]:
    """Lote de invernada sin pesaje en los últimos 60 días."""
    result = await db.execute(
        text("""
            WITH pesajes_lote AS (
                -- pesajes de tipo lote_estimado
                SELECT ep.lote_id, MAX(e.fecha_evento) AS ultima_fecha
                FROM evento_pesajes ep
                JOIN eventos e ON e.id = ep.evento_id
                WHERE ep.lote_id IS NOT NULL AND e.anulado = FALSE
                  AND ep.tipo = 'lote_estimado'
                GROUP BY ep.lote_id
                UNION ALL
                -- pesajes individuales de animales activos del lote
                SELECT a.lote_actual_id, MAX(e.fecha_evento) AS ultima_fecha
                FROM evento_pesajes ep
                JOIN eventos e ON e.id = ep.evento_id
                JOIN animales a ON a.id = ep.animal_id
                WHERE a.lote_actual_id IS NOT NULL
                  AND ep.tipo = 'individual'
                  AND e.anulado = FALSE
                GROUP BY a.lote_actual_id
            ),
            ultimo_por_lote AS (
                SELECT lote_id, MAX(ultima_fecha) AS ultimo_pesaje
                FROM pesajes_lote
                GROUP BY lote_id
            )
            SELECT l.id, l.nombre, up.ultimo_pesaje
            FROM lotes l
            LEFT JOIN ultimo_por_lote up ON up.lote_id = l.id
            WHERE l.establecimiento_id = :est_id
              AND l.estado = 'activo'
              AND l.proposito = 'invernada'
              AND (
                up.ultimo_pesaje IS NULL
                OR up.ultimo_pesaje < (CURRENT_DATE - INTERVAL '60 days')::DATE
              )
            ORDER BY up.ultimo_pesaje ASC NULLS FIRST
        """),
        {"est_id": est},
    )
    alertas = []
    for r in result.all():
        if r.ultimo_pesaje is None:
            msg = "Sin pesaje registrado en este lote."
        else:
            dias = (today - r.ultimo_pesaje).days
            msg = f"Último pesaje hace {dias} días (supera los 60 días recomendados para invernada)."
        alertas.append(AlertaRead(
            tipo="sin_pesaje_invernada_60d",
            severidad="media",
            entidad_tipo="lote",
            entidad_id=r.id,
            entidad_label=r.nombre,
            mensaje=msg,
        ))
    return alertas


async def _alerta_lote_invernada_sin_gdp(
    db: AsyncSession, est: str
) -> list[AlertaRead]:
    """Lote de invernada sin GDP calculable: ni individual (>=2 pesajes por animal)
    ni estimado de lote (>=2 pesajes lote_estimado) — coincide con el fallback de
    calcular_gdp_lote() en services/pesajes.py."""
    result = await db.execute(
        text("""
            WITH animales_con_gdp AS (
                SELECT a.lote_actual_id, COUNT(DISTINCT a.id) AS con_gdp
                FROM animales a
                WHERE a.establecimiento_id = :est_id
                  AND a.estado = 'activo'
                  AND a.lote_actual_id IS NOT NULL
                  AND (
                    SELECT COUNT(*) FROM evento_pesajes ep
                    JOIN eventos e ON e.id = ep.evento_id
                    WHERE ep.animal_id = a.id
                      AND ep.tipo = 'individual'
                      AND e.anulado = FALSE
                  ) >= 2
                GROUP BY a.lote_actual_id
            ),
            lotes_con_gdp_estimado AS (
                SELECT ep.lote_id, COUNT(DISTINCT e.fecha_evento) AS con_gdp
                FROM evento_pesajes ep
                JOIN eventos e ON e.id = ep.evento_id
                WHERE ep.lote_id IS NOT NULL
                  AND ep.tipo = 'lote_estimado'
                  AND e.anulado = FALSE
                GROUP BY ep.lote_id
                HAVING COUNT(DISTINCT e.fecha_evento) >= 2
            )
            SELECT l.id, l.nombre
            FROM lotes l
            LEFT JOIN animales_con_gdp ag ON ag.lote_actual_id = l.id
            LEFT JOIN lotes_con_gdp_estimado le ON le.lote_id = l.id
            WHERE l.establecimiento_id = :est_id
              AND l.estado = 'activo'
              AND l.proposito = 'invernada'
              AND COALESCE(ag.con_gdp, 0) = 0
              AND le.lote_id IS NULL
        """),
        {"est_id": est},
    )
    return [
        AlertaRead(
            tipo="lote_invernada_sin_gdp",
            severidad="media",
            entidad_tipo="lote",
            entidad_id=r.id,
            entidad_label=r.nombre,
            mensaje="El lote no tiene GDP calculable. Se necesitan al menos 2 pesajes individuales o 2 pesajes de lote.",
        )
        for r in result.all()
    ]


async def _alerta_animal_sin_categoria(
    db: AsyncSession, est: str
) -> list[AlertaRead]:
    """Animales activos sin categoría vigente asignada — afecta cálculo de UG."""
    result = await db.execute(
        text("""
            SELECT a.id, a.caravana_senacsa, a.numero_campo, a.potrero_actual_id
            FROM animales a
            LEFT JOIN animal_categorias ac
                ON ac.animal_id = a.id AND ac.fecha_fin IS NULL
            WHERE a.establecimiento_id = :est_id
              AND a.estado = 'activo'
              AND ac.id IS NULL
            ORDER BY a.created_at ASC
            LIMIT :lim
        """),
        {"est_id": est, "lim": _LIMIT_PER_TYPE},
    )
    return [
        AlertaRead(
            tipo="animal_sin_categoria",
            severidad="media",
            entidad_tipo="animal",
            entidad_id=r.id,
            entidad_label=_label(r.caravana_senacsa, r.numero_campo),
            mensaje="Animal sin categoría asignada. La carga animal en UG no es precisa.",
            potrero_id=r.potrero_actual_id,
        )
        for r in result.all()
    ]
