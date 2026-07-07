import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

EstadoPotrero = Literal["activo", "en_descanso", "en_recuperacion", "archivado"]


class PotreroCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    superficie_ha: Decimal | None = Field(default=None, gt=0)
    tipo_pastura: str | None = None
    capacidad_max_ug_ha: Decimal | None = Field(default=None, gt=0)


class PotreroUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    superficie_ha: Decimal | None = Field(default=None, gt=0)
    tipo_pastura: str | None = None
    capacidad_max_ug_ha: Decimal | None = Field(default=None, gt=0)
    estado: EstadoPotrero | None = None


class PotreroRead(BaseModel):
    id: uuid.UUID
    establecimiento_id: uuid.UUID
    nombre: str
    superficie_ha: Decimal | None
    tipo_pastura: str | None
    capacidad_max_ug_ha: Decimal | None
    estado: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
