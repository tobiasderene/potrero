"""Indicadores de carga animal por potrero (IND-05, IND-06)."""

import uuid
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.potreros import Potrero
from app.schemas.movimientos import CargaAnimalRead

# IND-06: umbrales semáforo
UMBRAL_AMARILLO = Decimal("85")
UMBRAL_ROJO = Decimal("110")


async def calcular_carga(
    db: AsyncSession,
    potrero: Potrero,
) -> CargaAnimalRead:
    result = await db.execute(
        text("""
            SELECT
                COALESCE(SUM(cat.coeficiente_ug), 0)::NUMERIC(10,2) AS carga_ug,
                COUNT(a.id)::INTEGER                                  AS total_animales
            FROM animales a
            JOIN animal_categorias ac
              ON ac.animal_id = a.id AND ac.fecha_fin IS NULL
            JOIN categorias cat
              ON cat.nombre = ac.categoria
             AND cat.establecimiento_id = a.establecimiento_id
            WHERE a.potrero_actual_id = :potrero_id
              AND a.estado = 'activo'
        """),
        {"potrero_id": str(potrero.id)},
    )
    row = result.one()
    carga_actual_ug = Decimal(str(row.carga_ug))
    total_animales = int(row.total_animales)

    capacidad_total_ug: Decimal | None = None
    porcentaje: Decimal | None = None
    semaforo = None
    estado_carga = "sin_dato_suficiente"

    if potrero.superficie_ha and potrero.capacidad_max_ug_ha:
        capacidad_total_ug = potrero.superficie_ha * potrero.capacidad_max_ug_ha
        estado_carga = "completo"
        if capacidad_total_ug > 0:
            porcentaje = (carga_actual_ug / capacidad_total_ug * 100).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            if porcentaje <= UMBRAL_AMARILLO:
                semaforo = "verde"
            elif porcentaje <= UMBRAL_ROJO:
                semaforo = "amarillo"
            else:
                semaforo = "rojo"
    elif potrero.superficie_ha or potrero.capacidad_max_ug_ha:
        estado_carga = "parcial"

    return CargaAnimalRead(
        potrero_id=potrero.id,
        potrero_nombre=potrero.nombre,
        superficie_ha=potrero.superficie_ha,
        capacidad_max_ug_ha=potrero.capacidad_max_ug_ha,
        capacidad_total_ug=capacidad_total_ug,
        carga_actual_ug=carga_actual_ug,
        total_animales=total_animales,
        porcentaje_ocupacion=porcentaje,
        estado_carga=estado_carga,
        semaforo=semaforo,
    )
