import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_establecimiento_id, get_db
from app.crud import eventos as crud_ev
from app.schemas.movimientos import (
    EgresoMuerteInput,
    EgresoVentaInput,
    IngresoCompraInput,
    MovimientoRead,
    NacimientoInput,
    TrasladoInternoInput,
)
from app.services import movimientos as svc

router = APIRouter(prefix="/movimientos", tags=["movimientos"])


@router.post(
    "/ingreso-compra",
    response_model=MovimientoRead,
    status_code=status.HTTP_201_CREATED,
)
async def ingreso_compra(
    data: IngresoCompraInput,
    user_id: uuid.UUID = Depends(get_current_user_id),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> MovimientoRead:
    return await svc.registrar_ingreso_compra(db, establecimiento_id, data, user_id)


@router.post(
    "/nacimiento",
    response_model=MovimientoRead,
    status_code=status.HTTP_201_CREATED,
)
async def nacimiento(
    data: NacimientoInput,
    user_id: uuid.UUID = Depends(get_current_user_id),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> MovimientoRead:
    return await svc.registrar_nacimiento(db, establecimiento_id, data, user_id)


@router.post(
    "/traslado",
    response_model=MovimientoRead,
    status_code=status.HTTP_201_CREATED,
)
async def traslado_interno(
    data: TrasladoInternoInput,
    user_id: uuid.UUID = Depends(get_current_user_id),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> MovimientoRead:
    return await svc.registrar_traslado(db, establecimiento_id, data, user_id)


@router.post(
    "/egreso-venta",
    response_model=MovimientoRead,
    status_code=status.HTTP_201_CREATED,
)
async def egreso_venta(
    data: EgresoVentaInput,
    user_id: uuid.UUID = Depends(get_current_user_id),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> MovimientoRead:
    return await svc.registrar_egreso_venta(db, establecimiento_id, data, user_id)


@router.post(
    "/egreso-muerte",
    response_model=MovimientoRead,
    status_code=status.HTTP_201_CREATED,
)
async def egreso_muerte(
    data: EgresoMuerteInput,
    user_id: uuid.UUID = Depends(get_current_user_id),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> MovimientoRead:
    return await svc.registrar_egreso_muerte(db, establecimiento_id, data, user_id)


@router.get("/{evento_id}", response_model=MovimientoRead)
async def get_movimiento(
    evento_id: uuid.UUID,
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> MovimientoRead:
    res = await crud_ev.get_evento_movimiento(db, evento_id, establecimiento_id)
    if not res:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    evento, em, animal_ids = res
    return MovimientoRead(
        evento_id=evento.id,
        tipo_movimiento=em.tipo_movimiento,
        fecha_evento=evento.fecha_evento,
        fecha_registro=evento.fecha_registro,
        observaciones=evento.observaciones,
        animal_ids=animal_ids,
        potrero_origen_id=em.potrero_origen_id,
        potrero_destino_id=em.potrero_destino_id,
        lote_destino_id=em.lote_destino_id,
        proveedor=em.proveedor,
        establecimiento_origen=em.establecimiento_origen,
        numero_guia_senacsa=em.numero_guia_senacsa,
        precio_unitario=em.precio_unitario,
        tipo_precio=em.tipo_precio,
        moneda=em.moneda,
        comprador=em.comprador,
        destino_venta=em.destino_venta,
        precio_venta_unitario=em.precio_venta_unitario,
        peso_venta_promedio_kg=em.peso_venta_promedio_kg,
        causa_muerte=em.causa_muerte,
        advertencias=[],
    )
