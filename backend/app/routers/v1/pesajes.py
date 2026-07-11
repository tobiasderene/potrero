import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_establecimiento_id, get_db
from app.schemas.pesajes import (
    GdpAnimalRead,
    GdpLoteRead,
    GdpPotreroRead,
    PesajeIndividualInput,
    PesajeLoteInput,
    PesajeRead,
    VariacionGdpRead,
)
from app.services import pesajes as svc

router = APIRouter(prefix="/pesajes", tags=["pesajes"])


@router.post(
    "/individual",
    response_model=PesajeRead,
    status_code=status.HTTP_201_CREATED,
)
async def pesaje_individual(
    data: PesajeIndividualInput,
    user_id: uuid.UUID = Depends(get_current_user_id),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> PesajeRead:
    return await svc.registrar_pesaje_individual(db, establecimiento_id, data, user_id)


@router.post(
    "/lote",
    response_model=PesajeRead,
    status_code=status.HTTP_201_CREATED,
)
async def pesaje_lote(
    data: PesajeLoteInput,
    user_id: uuid.UUID = Depends(get_current_user_id),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> PesajeRead:
    return await svc.registrar_pesaje_lote(db, establecimiento_id, data, user_id)


@router.get("/animal/{animal_id}/gdp", response_model=GdpAnimalRead)
async def gdp_animal(
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> GdpAnimalRead:
    return await svc.calcular_gdp_animal(db, animal_id, establecimiento_id)


@router.get("/animal/{animal_id}/variacion", response_model=VariacionGdpRead)
async def variacion_gdp_animal(
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> VariacionGdpRead:
    return await svc.calcular_variacion_gdp(db, animal_id, establecimiento_id)


@router.get("/lote/{lote_id}/gdp", response_model=GdpLoteRead)
async def gdp_lote(
    lote_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> GdpLoteRead:
    return await svc.calcular_gdp_lote(db, lote_id, establecimiento_id)


@router.get("/potrero/{potrero_id}/gdp", response_model=GdpPotreroRead)
async def gdp_potrero(
    potrero_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> GdpPotreroRead:
    return await svc.calcular_gdp_potrero(db, potrero_id, establecimiento_id)


@router.patch(
    "/{evento_id}/anular",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def anular_pesaje(
    evento_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    await svc.anular_pesaje(db, establecimiento_id, evento_id)


@router.get("/lote/{lote_id}", response_model=list[PesajeRead])
async def historial_pesajes_lote(
    lote_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> list[PesajeRead]:
    from app.crud import pesajes as crud_p
    rows = await crud_p.get_pesajes_lote(db, lote_id, establecimiento_id)
    return [
        PesajeRead(
            evento_id=ev.id,
            fecha_evento=ev.fecha_evento,
            fecha_registro=ev.fecha_registro,
            tipo=ep.tipo,
            animal_id=ep.animal_id,
            lote_id=ep.lote_id,
            peso_kg=ep.peso_kg,
            cantidad_muestra=ep.cantidad_muestra,
            gdp_g_dia=ep.gdp_g_dia,
            dias_intervalo=ep.dias_intervalo,
            observaciones=ev.observaciones,
        )
        for ev, ep in rows
    ]


@router.get("/animal/{animal_id}", response_model=list[PesajeRead])
async def historial_pesajes_animal(
    animal_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> list[PesajeRead]:
    from app.crud import pesajes as crud_p
    rows = await crud_p.get_pesajes_animal(db, animal_id, establecimiento_id)
    return [
        PesajeRead(
            evento_id=ev.id,
            fecha_evento=ev.fecha_evento,
            fecha_registro=ev.fecha_registro,
            tipo=ep.tipo,
            animal_id=ep.animal_id,
            lote_id=ep.lote_id,
            peso_kg=ep.peso_kg,
            cantidad_muestra=ep.cantidad_muestra,
            gdp_g_dia=ep.gdp_g_dia,
            dias_intervalo=ep.dias_intervalo,
            observaciones=ev.observaciones,
        )
        for ev, ep in rows
    ]
