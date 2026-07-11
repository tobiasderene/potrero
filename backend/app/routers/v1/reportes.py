import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_establecimiento_id
from app.schemas.reportes import ReporteInventarioRead, ReporteMovimientosRead
from app.services import reportes as svc

router = APIRouter(prefix="/reportes", tags=["reportes"])


@router.get("/inventario", response_model=ReporteInventarioRead)
async def inventario(
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> ReporteInventarioRead:
    return await svc.get_inventario(db, establecimiento_id)


@router.get("/movimientos", response_model=ReporteMovimientosRead)
async def movimientos_periodo(
    fecha_desde: date = Query(..., description="Inicio del período (YYYY-MM-DD)"),
    fecha_hasta: date = Query(..., description="Fin del período (YYYY-MM-DD)"),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> ReporteMovimientosRead:
    if fecha_desde > fecha_hasta:
        raise HTTPException(400, "fecha_desde no puede ser posterior a fecha_hasta")
    return await svc.get_movimientos_periodo(db, establecimiento_id, fecha_desde, fecha_hasta)
