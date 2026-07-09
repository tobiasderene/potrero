import uuid
from datetime import date
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import eventos as crud_ev
from app.crud import pesajes as crud_p
from app.models.animales import Animal
from app.models.lotes import Lote
from app.schemas.pesajes import (
    GdpAnimalRead,
    GdpLoteRead,
    PesajeIndividualInput,
    PesajeLoteInput,
    PesajeRead,
    VariacionGdpRead,
)


async def registrar_pesaje_individual(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: PesajeIndividualInput,
    user_id: uuid.UUID,
) -> PesajeRead:
    today = date.today()
    if data.fecha_evento > today:
        raise HTTPException(status_code=400, detail="RN-18: la fecha del evento no puede ser futura")

    animal = await db.get(Animal, data.animal_id)
    if not animal or animal.establecimiento_id != establecimiento_id:
        raise HTTPException(status_code=404, detail="Animal no encontrado")
    if animal.estado != "activo":
        raise HTTPException(status_code=400, detail="El animal no está activo")

    evento = await crud_ev.create_evento(
        db, establecimiento_id, "pesaje", data.fecha_evento, user_id, data.observaciones
    )
    await crud_ev.create_eventos_animales(db, evento.id, [data.animal_id])

    # Flush para que el pesaje sea visible en la DB antes de calcular GDP
    await db.flush()

    # Crear registro del pesaje primero sin GDP
    ep = await crud_p.create_pesaje(
        db,
        evento_id=evento.id,
        tipo="individual",
        peso_kg=data.peso_kg,
        animal_id=data.animal_id,
    )

    await db.flush()

    # Calcular GDP con la función SQL (IND-01): incluye el pesaje que acabamos de insertar
    gdp, peso_anterior, dias = await crud_p.calcular_gdp_db(db, data.animal_id)

    if gdp is not None:
        ep.gdp_g_dia = gdp
        ep.dias_intervalo = dias

    await db.commit()

    return PesajeRead(
        evento_id=evento.id,
        fecha_evento=evento.fecha_evento,
        fecha_registro=evento.fecha_registro,
        tipo="individual",
        animal_id=data.animal_id,
        lote_id=None,
        peso_kg=ep.peso_kg,
        cantidad_muestra=None,
        gdp_g_dia=ep.gdp_g_dia,
        dias_intervalo=ep.dias_intervalo,
        observaciones=evento.observaciones,
    )


async def registrar_pesaje_lote(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: PesajeLoteInput,
    user_id: uuid.UUID,
) -> PesajeRead:
    today = date.today()
    if data.fecha_evento > today:
        raise HTTPException(status_code=400, detail="RN-18: la fecha del evento no puede ser futura")

    lote = await db.get(Lote, data.lote_id)
    if not lote or lote.establecimiento_id != establecimiento_id:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    if lote.estado != "activo":
        raise HTTPException(status_code=400, detail="El lote no está activo")

    evento = await crud_ev.create_evento(
        db, establecimiento_id, "pesaje", data.fecha_evento, user_id, data.observaciones
    )

    ep = await crud_p.create_pesaje(
        db,
        evento_id=evento.id,
        tipo="lote_estimado",
        peso_kg=data.peso_kg,
        lote_id=data.lote_id,
        cantidad_muestra=data.cantidad_muestra,
    )

    await db.flush()

    gdp, dias = await crud_p.calcular_gdp_lote_estimado(db, data.lote_id)
    if gdp is not None:
        ep.gdp_g_dia = gdp
        ep.dias_intervalo = dias

    await db.commit()

    return PesajeRead(
        evento_id=evento.id,
        fecha_evento=evento.fecha_evento,
        fecha_registro=evento.fecha_registro,
        tipo="lote_estimado",
        animal_id=None,
        lote_id=data.lote_id,
        peso_kg=ep.peso_kg,
        cantidad_muestra=ep.cantidad_muestra,
        gdp_g_dia=ep.gdp_g_dia,
        dias_intervalo=ep.dias_intervalo,
        observaciones=evento.observaciones,
    )


async def anular_pesaje(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    evento_id: uuid.UUID,
) -> None:
    evento = await crud_p.anular_pesaje(db, evento_id, establecimiento_id)
    if evento is None:
        raise HTTPException(status_code=404, detail="Pesaje no encontrado")
    if evento.anulado:
        raise HTTPException(status_code=409, detail="El pesaje ya está anulado")
    await db.commit()


async def calcular_gdp_animal(
    db: AsyncSession,
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
) -> GdpAnimalRead:
    animal = await db.get(Animal, animal_id)
    if not animal or animal.establecimiento_id != establecimiento_id:
        raise HTTPException(status_code=404, detail="Animal no encontrado")

    gdp, peso_anterior, dias = await crud_p.calcular_gdp_db(db, animal_id)

    if gdp is None:
        return GdpAnimalRead(
            animal_id=animal_id,
            gdp_g_dia=None,
            peso_anterior_kg=None,
            dias_intervalo=None,
            estado="sin_dato_suficiente",
        )

    return GdpAnimalRead(
        animal_id=animal_id,
        gdp_g_dia=gdp,
        peso_anterior_kg=peso_anterior,
        dias_intervalo=dias,
        estado="completo",
    )


async def calcular_gdp_lote(
    db: AsyncSession,
    lote_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
) -> GdpLoteRead:
    lote = await db.get(Lote, lote_id)
    if not lote or lote.establecimiento_id != establecimiento_id:
        raise HTTPException(status_code=404, detail="Lote no encontrado")

    animal_ids = await crud_p.get_animales_lote_activos(db, lote_id)
    total_animales = len(animal_ids)

    gdp_values: list[Decimal] = []
    for aid in animal_ids:
        gdp, _, _ = await crud_p.calcular_gdp_db(db, aid)
        if gdp is not None:
            gdp_values.append(gdp)

    if not gdp_values:
        # Fallback: pesajes lote_estimado cuando no hay individuales
        gdp_est, _ = await crud_p.calcular_gdp_lote_estimado(db, lote_id)
        if gdp_est is not None:
            return GdpLoteRead(
                lote_id=lote_id,
                gdp_promedio_g_dia=gdp_est,
                gdp_minimo_g_dia=None,
                gdp_maximo_g_dia=None,
                total_animales_con_gdp=0,
                total_animales_lote=total_animales,
                estado="parcial",
            )
        return GdpLoteRead(
            lote_id=lote_id,
            gdp_promedio_g_dia=None,
            gdp_minimo_g_dia=None,
            gdp_maximo_g_dia=None,
            total_animales_con_gdp=0,
            total_animales_lote=total_animales,
            estado="sin_dato_suficiente",
        )

    promedio = sum(gdp_values) / len(gdp_values)
    estado = "completo" if len(gdp_values) == total_animales else "parcial"

    return GdpLoteRead(
        lote_id=lote_id,
        gdp_promedio_g_dia=round(promedio, 2),
        gdp_minimo_g_dia=min(gdp_values),
        gdp_maximo_g_dia=max(gdp_values),
        total_animales_con_gdp=len(gdp_values),
        total_animales_lote=total_animales,
        estado=estado,
    )


async def calcular_variacion_gdp(
    db: AsyncSession,
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
) -> VariacionGdpRead:
    animal = await db.get(Animal, animal_id)
    if not animal or animal.establecimiento_id != establecimiento_id:
        raise HTTPException(status_code=404, detail="Animal no encontrado")

    gdp_animal, _, _ = await crud_p.calcular_gdp_db(db, animal_id)

    if animal.lote_actual_id is None:
        return VariacionGdpRead(
            animal_id=animal_id,
            gdp_animal_g_dia=gdp_animal,
            gdp_promedio_lote_g_dia=None,
            porcentaje_vs_promedio=None,
            alerta_bajo=False,
            estado="sin_dato_suficiente",
        )

    gdp_lote = await calcular_gdp_lote(db, animal.lote_actual_id, establecimiento_id)

    if gdp_animal is None or gdp_lote.gdp_promedio_g_dia is None:
        return VariacionGdpRead(
            animal_id=animal_id,
            gdp_animal_g_dia=gdp_animal,
            gdp_promedio_lote_g_dia=gdp_lote.gdp_promedio_g_dia,
            porcentaje_vs_promedio=None,
            alerta_bajo=False,
            estado="sin_dato_suficiente",
        )

    if gdp_lote.gdp_promedio_g_dia == 0:
        porcentaje = None
        alerta = False
    else:
        porcentaje = round((gdp_animal / gdp_lote.gdp_promedio_g_dia) * 100, 1)
        alerta = porcentaje < Decimal("75")

    return VariacionGdpRead(
        animal_id=animal_id,
        gdp_animal_g_dia=gdp_animal,
        gdp_promedio_lote_g_dia=gdp_lote.gdp_promedio_g_dia,
        porcentaje_vs_promedio=porcentaje,
        alerta_bajo=alerta,
        estado="completo",
    )
