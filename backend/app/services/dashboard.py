"""Dashboard ejecutivo — IND-08, IND-05, IND-01/02, últimos movimientos."""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.dashboard import (
    CargaEstablecimientoRead,
    DashboardRead,
    GdpRodeoRead,
    MovimientoResumenRead,
    StockCategoriaRead,
    StockRead,
)


async def get_dashboard(db: AsyncSession, establecimiento_id: uuid.UUID) -> DashboardRead:
    today = date.today()
    est = str(establecimiento_id)

    stock = await _get_stock(db, est)
    carga = await _get_carga_establecimiento(db, est, stock.total_activos)
    gdp_rodeo = await _get_gdp_rodeo(db, est, stock.total_activos)
    movimientos = await _get_ultimos_movimientos(db, est)

    return DashboardRead(
        fecha_consulta=today,
        stock=stock,
        carga_establecimiento=carga,
        gdp_rodeo=gdp_rodeo,
        ultimos_movimientos=movimientos,
    )


async def _get_stock(db: AsyncSession, est: str) -> StockRead:
    result = await db.execute(
        text("""
            SELECT
                COALESCE(ac.categoria, 'sin_categoría') AS categoria,
                COUNT(a.id)::INTEGER                    AS total,
                MAX(cat.coeficiente_ug)::NUMERIC(6,2)  AS coeficiente_ug
            FROM animales a
            LEFT JOIN animal_categorias ac
                ON ac.animal_id = a.id AND ac.fecha_fin IS NULL
            LEFT JOIN categorias cat
                ON cat.nombre = ac.categoria
               AND cat.establecimiento_id = a.establecimiento_id
            WHERE a.establecimiento_id = :est_id
              AND a.estado = 'activo'
            GROUP BY COALESCE(ac.categoria, 'sin_categoría')
            ORDER BY total DESC
        """),
        {"est_id": est},
    )
    rows = result.all()
    total = sum(r.total for r in rows)
    por_categoria = [
        StockCategoriaRead(
            categoria=r.categoria,
            total=r.total,
            coeficiente_ug=Decimal(str(r.coeficiente_ug)) if r.coeficiente_ug is not None else None,
        )
        for r in rows
    ]
    return StockRead(
        por_categoria=por_categoria,
        total_activos=total,
        estado="completo" if rows else "sin_dato_suficiente",
    )


async def _get_carga_establecimiento(
    db: AsyncSession, est: str, total_animales: int
) -> CargaEstablecimientoRead:
    result = await db.execute(
        text("""
            SELECT
                COALESCE(SUM(cat.coeficiente_ug), 0)::NUMERIC(10,2) AS total_ug,
                COALESCE(
                    (SELECT SUM(p.superficie_ha)
                     FROM potreros p
                     WHERE p.establecimiento_id = :est_id
                       AND p.estado = 'activo'
                       AND p.superficie_ha IS NOT NULL
                    ), 0
                )::NUMERIC(10,2) AS total_superficie_ha
            FROM animales a
            LEFT JOIN animal_categorias ac
                ON ac.animal_id = a.id AND ac.fecha_fin IS NULL
            LEFT JOIN categorias cat
                ON cat.nombre = ac.categoria
               AND cat.establecimiento_id = a.establecimiento_id
            WHERE a.establecimiento_id = :est_id
              AND a.estado = 'activo'
        """),
        {"est_id": est},
    )
    row = result.one()
    total_ug = Decimal(str(row.total_ug))
    total_sup = Decimal(str(row.total_superficie_ha))

    carga_promedio = None
    estado: str
    if total_sup > 0:
        carga_promedio = (total_ug / total_sup).quantize(Decimal("0.01"))
        estado = "completo"
    elif total_sup == 0 and total_animales > 0:
        estado = "parcial"
    else:
        estado = "sin_dato_suficiente"

    return CargaEstablecimientoRead(
        total_ug=total_ug,
        total_animales=total_animales,
        total_superficie_ha=total_sup if total_sup > 0 else None,
        carga_promedio_ug_ha=carga_promedio,
        estado=estado,  # type: ignore[arg-type]
    )


async def _get_gdp_rodeo(
    db: AsyncSession, est: str, total_activos: int
) -> GdpRodeoRead:
    """Single SQL query — evita N+1 sobre los animales del establecimiento."""
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
            ),
            gdp_calc AS (
                SELECT
                    curr.animal_id,
                    CASE
                        WHEN prev.peso_kg IS NOT NULL
                         AND (curr.fecha_evento - prev.fecha_evento) > 0
                        THEN ROUND(
                            (curr.peso_kg - prev.peso_kg)::NUMERIC /
                            (curr.fecha_evento - prev.fecha_evento)::NUMERIC * 1000,
                            2
                        )
                        ELSE NULL
                    END AS gdp_g_dia
                FROM ranked curr
                LEFT JOIN ranked prev
                    ON prev.animal_id = curr.animal_id AND prev.rn = 2
                WHERE curr.rn = 1
            )
            SELECT
                COUNT(*) FILTER (WHERE gdp_g_dia IS NOT NULL)::INTEGER AS total_con_gdp,
                ROUND(AVG(gdp_g_dia) FILTER (WHERE gdp_g_dia IS NOT NULL), 2) AS gdp_promedio,
                ROUND(MIN(gdp_g_dia) FILTER (WHERE gdp_g_dia IS NOT NULL), 2) AS gdp_minimo,
                ROUND(MAX(gdp_g_dia) FILTER (WHERE gdp_g_dia IS NOT NULL), 2) AS gdp_maximo
            FROM gdp_calc
        """),
        {"est_id": est},
    )
    row = result.one()
    total_con_gdp = int(row.total_con_gdp or 0)

    gdp_promedio = Decimal(str(row.gdp_promedio)) if row.gdp_promedio is not None else None
    gdp_minimo = Decimal(str(row.gdp_minimo)) if row.gdp_minimo is not None else None
    gdp_maximo = Decimal(str(row.gdp_maximo)) if row.gdp_maximo is not None else None

    if total_con_gdp == 0:
        estado = "sin_dato_suficiente"
    elif total_con_gdp < total_activos:
        estado = "parcial"
    else:
        estado = "completo"

    return GdpRodeoRead(
        gdp_promedio_g_dia=gdp_promedio,
        gdp_minimo_g_dia=gdp_minimo,
        gdp_maximo_g_dia=gdp_maximo,
        total_animales_con_gdp=total_con_gdp,
        total_animales_activos=total_activos,
        estado=estado,  # type: ignore[arg-type]
    )


async def _get_ultimos_movimientos(
    db: AsyncSession, est: str
) -> list[MovimientoResumenRead]:
    result = await db.execute(
        text("""
            SELECT
                e.id           AS evento_id,
                em.tipo_movimiento,
                e.fecha_evento,
                COUNT(ea.id)::INTEGER AS total_animales,
                pd.nombre      AS potrero_destino_nombre,
                l.nombre       AS lote_destino_nombre
            FROM eventos e
            JOIN evento_movimientos em ON em.evento_id = e.id
            LEFT JOIN eventos_animales ea ON ea.evento_id = e.id
            LEFT JOIN potreros pd ON pd.id = em.potrero_destino_id
            LEFT JOIN lotes l ON l.id = em.lote_destino_id
            WHERE e.establecimiento_id = :est_id
              AND e.anulado = FALSE
            GROUP BY e.id, em.tipo_movimiento, e.fecha_evento, pd.nombre, l.nombre
            ORDER BY e.fecha_registro DESC
            LIMIT 5
        """),
        {"est_id": est},
    )
    return [
        MovimientoResumenRead(
            evento_id=row.evento_id,
            tipo_movimiento=row.tipo_movimiento,
            fecha_evento=row.fecha_evento,
            total_animales=int(row.total_animales),
            potrero_destino_nombre=row.potrero_destino_nombre,
            lote_destino_nombre=row.lote_destino_nombre,
        )
        for row in result.all()
    ]
