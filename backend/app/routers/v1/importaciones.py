import io
import uuid

from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_establecimiento_id, get_db
from app.schemas.importaciones import ImportacionRead
from app.services import importacion_csv as svc

router = APIRouter(prefix="/importaciones", tags=["importaciones"])


@router.get("/plantilla")
async def descargar_plantilla():
    return StreamingResponse(
        io.BytesIO(svc.PLANTILLA_CSV.encode("utf-8")),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=plantilla_animales.csv"},
    )


@router.post("", response_model=ImportacionRead, status_code=status.HTTP_201_CREATED)
async def importar_csv(
    archivo: UploadFile = File(...),
    user_id: uuid.UUID = Depends(get_current_user_id),
    establecimiento_id: uuid.UUID = Depends(get_establecimiento_id),
    db: AsyncSession = Depends(get_db),
) -> ImportacionRead:
    contenido = await archivo.read()
    texto = contenido.decode("utf-8-sig")
    importacion = await svc.procesar(db, establecimiento_id, user_id, texto, archivo.filename or "importacion.csv")
    return ImportacionRead.model_validate(importacion)
