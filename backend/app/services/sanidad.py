import uuid
from datetime import date, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import eventos as crud_ev
from app.crud import sanidad as crud_s
from app.models.animales import Animal
from app.schemas.sanidad import (
    CalendarioSanitarioRead,
    CarenciaActiva,
    DiagnosticoInput,
    DiagnosticoRead,
    ProximaAntiaftosa,
    TratamientoInput,
    TratamientoRead,
    VacunacionInput,
    VacunacionRead,
)


async def registrar_vacunacion(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: VacunacionInput,
    user_id: uuid.UUID,
) -> VacunacionRead:
    today = date.today()
    if data.fecha_evento > today:
        raise HTTPException(status_code=400, detail="RN-18: la fecha del evento no puede ser futura")

    if data.animal_ids and data.lote_id:
        raise HTTPException(
            status_code=400,
            detail="Provea animal_ids O lote_id, no ambos",
        )
    if not data.animal_ids and not data.lote_id:
        raise HTTPException(
            status_code=400,
            detail="Debe proveer animal_ids o lote_id",
        )

    if data.lote_id:
        # RN-17: descomponer en eventos individuales
        animales = await crud_s.get_animales_activos_lote(db, data.lote_id, establecimiento_id)
        if not animales:
            raise HTTPException(status_code=400, detail="El lote no tiene animales activos")
        animal_ids = [a.id for a in animales]
    else:
        animal_ids = data.animal_ids  # type: ignore[assignment]
        for aid in animal_ids:
            animal = await db.get(Animal, aid)
            if not animal or animal.establecimiento_id != establecimiento_id or animal.estado != "activo":
                raise HTTPException(status_code=400, detail=f"Animal {aid} no encontrado o inactivo")

    evento = await crud_ev.create_evento(
        db, establecimiento_id, "sanitario_vacunacion", data.fecha_evento, user_id, data.observaciones
    )

    # Un EventoAnimal por cada animal (RN-17)
    for aid in animal_ids:
        await crud_ev.create_eventos_animales(db, evento.id, [aid])

    ev = await crud_s.create_vacunacion(
        db,
        evento_id=evento.id,
        biologico=data.biologico,
        lote_id=data.lote_id,
        laboratorio=data.laboratorio,
        numero_lote_biologico=data.numero_lote_biologico,
        fecha_vencimiento_biol=data.fecha_vencimiento_biol,
        dosis_ml=data.dosis_ml,
        via_administracion=data.via_administracion,
        es_antiaftosa=data.es_antiaftosa,
    )

    await db.commit()

    return VacunacionRead(
        evento_id=evento.id,
        fecha_evento=evento.fecha_evento,
        fecha_registro=evento.fecha_registro,
        biologico=ev.biologico,
        laboratorio=ev.laboratorio,
        numero_lote_biologico=ev.numero_lote_biologico,
        fecha_vencimiento_biol=ev.fecha_vencimiento_biol,
        dosis_ml=ev.dosis_ml,
        via_administracion=ev.via_administracion,
        es_antiaftosa=ev.es_antiaftosa,
        lote_id=ev.lote_id,
        animal_ids=animal_ids,
        total_animales=len(animal_ids),
    )


async def registrar_tratamiento(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: TratamientoInput,
    user_id: uuid.UUID,
) -> TratamientoRead:
    today = date.today()
    if data.fecha_evento > today:
        raise HTTPException(status_code=400, detail="RN-18: la fecha del evento no puede ser futura")

    animal = await db.get(Animal, data.animal_id)
    if not animal or animal.establecimiento_id != establecimiento_id:
        raise HTTPException(status_code=404, detail="Animal no encontrado")
    if animal.estado != "activo":
        raise HTTPException(status_code=400, detail="El animal no está activo")

    # RN-07: fecha_fin_carencia = fecha_evento + dias_carencia
    fecha_fin_carencia = data.fecha_evento + timedelta(days=data.dias_carencia)

    evento = await crud_ev.create_evento(
        db, establecimiento_id, "sanitario_tratamiento", data.fecha_evento, user_id, data.observaciones
    )
    await crud_ev.create_eventos_animales(db, evento.id, [data.animal_id])

    et = await crud_s.create_tratamiento(
        db,
        evento_id=evento.id,
        animal_id=data.animal_id,
        medicamento=data.medicamento,
        fecha_fin_carencia=fecha_fin_carencia,
        dias_carencia=data.dias_carencia,
        diagnostico=data.diagnostico,
        dosis=data.dosis,
        via_administracion=data.via_administracion,
        duracion_dias=data.duracion_dias,
        veterinario=data.veterinario,
        costo=data.costo,
        moneda_costo=data.moneda_costo,
    )

    await db.commit()

    return TratamientoRead(
        evento_id=evento.id,
        fecha_evento=evento.fecha_evento,
        fecha_registro=evento.fecha_registro,
        animal_id=et.animal_id,
        diagnostico=et.diagnostico,
        medicamento=et.medicamento,
        dosis=et.dosis,
        via_administracion=et.via_administracion,
        duracion_dias=et.duracion_dias,
        dias_carencia=et.dias_carencia,
        fecha_fin_carencia=et.fecha_fin_carencia,
        veterinario=et.veterinario,
        costo=et.costo,
        moneda_costo=et.moneda_costo,
        observaciones=evento.observaciones,
    )


async def registrar_diagnostico(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: DiagnosticoInput,
    user_id: uuid.UUID,
) -> DiagnosticoRead:
    today = date.today()
    if data.fecha_evento > today:
        raise HTTPException(status_code=400, detail="RN-18: la fecha del evento no puede ser futura")

    animal = await db.get(Animal, data.animal_id)
    if not animal or animal.establecimiento_id != establecimiento_id:
        raise HTTPException(status_code=404, detail="Animal no encontrado")
    if animal.estado != "activo":
        raise HTTPException(status_code=400, detail="El animal no está activo")

    evento = await crud_ev.create_evento(
        db, establecimiento_id, "sanitario_diagnostico", data.fecha_evento, user_id, data.observaciones
    )
    await crud_ev.create_eventos_animales(db, evento.id, [data.animal_id])

    ed = await crud_s.create_diagnostico(
        db,
        evento_id=evento.id,
        animal_id=data.animal_id,
        descripcion=data.descripcion,
        veterinario=data.veterinario,
        con_tratamiento=data.con_tratamiento,
    )

    await db.commit()

    return DiagnosticoRead(
        evento_id=evento.id,
        fecha_evento=evento.fecha_evento,
        fecha_registro=evento.fecha_registro,
        animal_id=ed.animal_id,
        descripcion=ed.descripcion,
        veterinario=ed.veterinario,
        con_tratamiento=ed.con_tratamiento,
        observaciones=evento.observaciones,
    )


async def get_calendario_sanitario(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
) -> CalendarioSanitarioRead:
    today = date.today()

    carencias_rows = await crud_s.get_carencias_activas(db, establecimiento_id)
    carencias = [
        CarenciaActiva(
            animal_id=row.animal_id,
            caravana_senacsa=row.caravana_senacsa,
            numero_campo=row.numero_campo,
            medicamento=row.medicamento,
            fecha_fin_carencia=row.fecha_fin_carencia,
            dias_restantes=(row.fecha_fin_carencia - today).days,
        )
        for row in carencias_rows
    ]

    antiaftosa_rows = await crud_s.get_proximas_antiaftosa(db, establecimiento_id)
    proximas: list[ProximaAntiaftosa] = []
    for row in antiaftosa_rows:
        if row.ultima_antiaftosa is None:
            estado = "sin_registro"
            dias = None
        elif row.dias_para_vencimiento is not None and row.dias_para_vencimiento < 0:
            estado = "vencido"
            dias = row.dias_para_vencimiento
        elif row.dias_para_vencimiento is not None and row.dias_para_vencimiento <= 30:
            estado = "proximo"
            dias = row.dias_para_vencimiento
        else:
            estado = "al_dia"
            dias = row.dias_para_vencimiento

        proximas.append(ProximaAntiaftosa(
            animal_id=row.animal_id,
            caravana_senacsa=row.caravana_senacsa,
            numero_campo=row.numero_campo,
            ultima_antiaftosa=row.ultima_antiaftosa,
            proxima_estimada=row.proxima_estimada,
            dias_para_vencimiento=dias,
            estado=estado,
        ))

    return CalendarioSanitarioRead(
        carencias_activas=carencias,
        proximas_antiaftosa=proximas,
        total_carencias=len(carencias),
        total_proximas_antiaftosa=len(proximas),
    )
