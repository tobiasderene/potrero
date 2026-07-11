import uuid
from datetime import datetime

from pydantic import BaseModel


class ErrorFila(BaseModel):
    fila: int
    datos: dict
    errores: list[str]


class ImportacionRead(BaseModel):
    id: uuid.UUID
    nombre_archivo: str
    total_filas: int | None
    filas_exitosas: int | None
    filas_con_error: int | None
    estado: str
    reporte_errores: list[ErrorFila] | None
    created_at: datetime
    completado_at: datetime | None

    model_config = {"from_attributes": True}
