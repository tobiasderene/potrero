import uuid
from typing import Literal

from pydantic import BaseModel


class AlertaRead(BaseModel):
    tipo: str
    severidad: Literal["critica", "alta", "media"]
    entidad_tipo: str  # "animal", "potrero", "lote"
    entidad_id: uuid.UUID | None
    entidad_label: str | None
    mensaje: str


class AlertasResponse(BaseModel):
    total: int
    total_criticas: int
    total_altas: int
    total_medias: int
    alertas: list[AlertaRead]
