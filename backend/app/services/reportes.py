"""Datos para reportes exportables — PDF e Excel se generan en el frontend."""

import uuid
from datetime import date

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.establecimientos import Establecimiento
from app.schemas.reportes import (
    AnimalInventarioRow,
    MovimientoReporteRow,
    ReporteInventarioRead,
    ReporteMovimientosRead,
)


async def _get_est_nombre(db: AsyncSession, est_id: uuid.UUID) -> str:
    r = await db.get(Establecimiento, est_id)
    return r.nombre if r else "Establecimiento"


async def get_inventario(
    db: AsyncSession, establecimiento_id: uuid.UUID
) -> ReporteInventarioRead:
    est_nombre = await _get_est_nombre(db, establecimiento_id)

    result = await db.execute(
        text("""
            SELECT
                a.id,
                a.caravana_senacsa,
                a.numero_campo,
                a.sexo,
                a.raza,
                a.fecha_nacimiento,
                COALESCE(ac.categoria, 'sin_categoría') AS categoria,
                p.nombre   AS potrero_nombre,
                l.nombre   AS lote_nombre,
                COALESCE(cat.coeficiente_ug, 0)::NUMERIC(6,2) AS coeficiente_ug
            FROM animales a
            LEFT JOIN animal_categorias ac
                ON ac.animal_id = a.id AND ac.fecha_fin IS NULL
            LEFT JOIN categorias cat
                ON cat.nombre = ac.categoria
               AND cat.establecimiento_id = a.establecimiento_id
            LEFT JOIN potreros p ON p.id = a.potrero_actual_id
            LEFT JOIN lotes l    ON l.id = a.lote_actual_id
            WHERE a.establecimiento_id = :est_id
              AND a.estado = 'activo'
            ORDER BY categoria, a.numero_campo NULLS LAST, a.caravana_senacsa NULLS LAST
        """),
        {"est_id": str(establecimiento_id)},
    )
    rows = result.all()

    animales = [
        AnimalInventarioRow(
            id=r.id,
            caravana_senacsa=r.caravana_senacsa,
            numero_campo=r.numero_campo,
            sexo=r.sexo,
            raza=r.raza,
            fecha_nacimiento=r.fecha_nacimiento,
            categoria=r.categoria,
            potrero_nombre=r.potrero_nombre,
            lote_nombre=r.lote_nombre,
            coeficiente_ug=r.coeficiente_ug,
        )
        for r in rows
    ]

    return ReporteInventarioRead(
        establecimiento_nombre=est_nombre,
        fecha_consulta=date.today(),
        total_animales=len(animales),
        animales=animales,
    )


async def get_movimientos_periodo(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    fecha_desde: date,
    fecha_hasta: date,
) -> ReporteMovimientosRead:
    est_nombre = await _get_est_nombre(db, establecimiento_id)

    result = await db.execute(
        text("""
            SELECT
                e.id                     AS evento_id,
                em.tipo_movimiento,
                e.fecha_evento,
                COUNT(ea.id)::INTEGER    AS total_animales,
                po.nombre                AS potrero_origen,
                pd.nombre                AS potrero_destino,
                COALESCE(em.proveedor, em.comprador) AS proveedor_comprador,
                COALESCE(em.precio_unitario, em.precio_venta_unitario) AS precio,
                em.moneda,
                em.numero_guia_senacsa
            FROM eventos e
            JOIN evento_movimientos em ON em.evento_id = e.id
            LEFT JOIN eventos_animales ea ON ea.evento_id = e.id
            LEFT JOIN potreros po ON po.id = em.potrero_origen_id
            LEFT JOIN potreros pd ON pd.id = em.potrero_destino_id
            WHERE e.establecimiento_id = :est_id
              AND e.anulado = FALSE
              AND e.fecha_evento BETWEEN :desde AND :hasta
            GROUP BY
                e.id, em.tipo_movimiento, e.fecha_evento,
                po.nombre, pd.nombre,
                em.proveedor, em.comprador,
                em.precio_unitario, em.precio_venta_unitario,
                em.moneda, em.numero_guia_senacsa
            ORDER BY e.fecha_evento DESC
        """),
        {"est_id": str(establecimiento_id), "desde": fecha_desde, "hasta": fecha_hasta},
    )
    rows = result.all()

    movimientos = [
        MovimientoReporteRow(
            evento_id=r.evento_id,
            tipo_movimiento=r.tipo_movimiento,
            fecha_evento=r.fecha_evento,
            total_animales=int(r.total_animales),
            potrero_origen=r.potrero_origen,
            potrero_destino=r.potrero_destino,
            proveedor_comprador=r.proveedor_comprador,
            precio=r.precio,
            moneda=r.moneda,
            numero_guia_senacsa=r.numero_guia_senacsa,
        )
        for r in rows
    ]

    return ReporteMovimientosRead(
        establecimiento_nombre=est_nombre,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        total_movimientos=len(movimientos),
        movimientos=movimientos,
    )
