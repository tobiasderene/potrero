import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_current_user_id, get_db
from app.crud import establecimientos as crud_est
from app.schemas.establecimientos import EstablecimientoRead

router = APIRouter(prefix="/auth", tags=["auth"])


class MeResponse(BaseModel):
    user_id: uuid.UUID
    email: str | None
    establecimiento: EstablecimientoRead | None
    rol: str | None


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: dict = Depends(get_current_user),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> MeResponse:
    ue = await crud_est.get_usuario_establecimiento(db, user_id)
    establecimiento = None
    rol = None
    if ue:
        establecimiento_obj = await crud_est.get_by_id(db, ue.establecimiento_id)
        if establecimiento_obj:
            establecimiento = EstablecimientoRead.model_validate(establecimiento_obj)
        rol = ue.rol

    return MeResponse(
        user_id=user_id,
        email=current_user.get("email"),
        establecimiento=establecimiento,
        rol=rol,
    )
