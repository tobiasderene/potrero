import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_establecimiento_id
from app.schemas.alertas import AlertasResponse
from app.services import alertas as svc

router = APIRouter(prefix="/alertas", tags=["alertas"])


@router.get("", response_model=AlertasResponse)
async def get_alertas(
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> AlertasResponse:
    return await svc.get_alertas(db, establecimiento_id)
