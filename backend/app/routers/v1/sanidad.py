import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_establecimiento_id, get_db
from app.schemas.sanidad import (
    CalendarioSanitarioRead,
    DiagnosticoInput,
    DiagnosticoRead,
    TratamientoInput,
    TratamientoRead,
    VacunacionInput,
    VacunacionRead,
)
from app.services import sanidad as svc

router = APIRouter(prefix="/sanidad", tags=["sanidad"])


@router.post(
    "/vacunaciones",
    response_model=VacunacionRead,
    status_code=status.HTTP_201_CREATED,
)
async def vacunacion(
    data: VacunacionInput,
    user_id: uuid.UUID = Depends(get_current_user_id),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> VacunacionRead:
    return await svc.registrar_vacunacion(db, establecimiento_id, data, user_id)


@router.post(
    "/tratamientos",
    response_model=TratamientoRead,
    status_code=status.HTTP_201_CREATED,
)
async def tratamiento(
    data: TratamientoInput,
    user_id: uuid.UUID = Depends(get_current_user_id),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> TratamientoRead:
    return await svc.registrar_tratamiento(db, establecimiento_id, data, user_id)


@router.post(
    "/diagnosticos",
    response_model=DiagnosticoRead,
    status_code=status.HTTP_201_CREATED,
)
async def diagnostico(
    data: DiagnosticoInput,
    user_id: uuid.UUID = Depends(get_current_user_id),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> DiagnosticoRead:
    return await svc.registrar_diagnostico(db, establecimiento_id, data, user_id)


@router.get("/calendario", response_model=CalendarioSanitarioRead)
async def calendario_sanitario(
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> CalendarioSanitarioRead:
    return await svc.get_calendario_sanitario(db, establecimiento_id)


@router.get("/animal/{animal_id}/tratamientos", response_model=list[TratamientoRead])
async def historial_tratamientos(
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> list[TratamientoRead]:
    from app.crud import sanidad as crud_s
    rows = await crud_s.get_tratamientos_animal(db, animal_id, establecimiento_id)
    return [
        TratamientoRead(
            evento_id=ev.id,
            fecha_evento=ev.fecha_evento,
            fecha_registro=ev.fecha_registro,
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
            observaciones=ev.observaciones,
        )
        for ev, et in rows
    ]


@router.get("/animal/{animal_id}/vacunaciones", response_model=list[VacunacionRead])
async def historial_vacunaciones(
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> list[VacunacionRead]:
    from app.crud import sanidad as crud_s
    from sqlalchemy import select
    from app.models.eventos import EventoAnimal
    rows = await crud_s.get_vacunaciones_animal(db, animal_id, establecimiento_id)
    result = []
    for ev, evac in rows:
        ea_res = await db.execute(
            select(EventoAnimal.animal_id).where(EventoAnimal.evento_id == ev.id)
        )
        aids = [r.animal_id for r in ea_res]
        result.append(VacunacionRead(
            evento_id=ev.id,
            fecha_evento=ev.fecha_evento,
            fecha_registro=ev.fecha_registro,
            biologico=evac.biologico,
            laboratorio=evac.laboratorio,
            numero_lote_biologico=evac.numero_lote_biologico,
            fecha_vencimiento_biol=evac.fecha_vencimiento_biol,
            dosis_ml=evac.dosis_ml,
            via_administracion=evac.via_administracion,
            es_antiaftosa=evac.es_antiaftosa,
            lote_id=evac.lote_id,
            animal_ids=aids,
            total_animales=len(aids),
        ))
    return result
