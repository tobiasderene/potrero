import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

PropositoLote = Literal["invernada", "cria", "recria", "reproduccion"]
EstadoLote = Literal["activo", "cerrado"]


class LoteCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    proposito: PropositoLote
    potrero_principal_id: uuid.UUID | None = None
    fecha_formacion: date
    peso_promedio_ingreso: Decimal | None = Field(default=None, gt=0)
    peso_objetivo_salida: Decimal | None = Field(default=None, gt=0)
    plazo_estimado_dias: int | None = Field(default=None, gt=0)


class LoteUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    proposito: PropositoLote | None = None
    potrero_principal_id: uuid.UUID | None = None
    peso_promedio_ingreso: Decimal | None = Field(default=None, gt=0)
    peso_objetivo_salida: Decimal | None = Field(default=None, gt=0)
    plazo_estimado_dias: int | None = Field(default=None, gt=0)


class LoteRead(BaseModel):
    id: uuid.UUID
    establecimiento_id: uuid.UUID
    nombre: str
    proposito: str
    potrero_principal_id: uuid.UUID | None
    fecha_formacion: date
    fecha_cierre: date | None
    peso_promedio_ingreso: Decimal | None
    peso_objetivo_salida: Decimal | None
    plazo_estimado_dias: int | None
    estado: str
    total_animales: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AsignarAnimalesInput(BaseModel):
    animal_ids: list[uuid.UUID] = Field(min_length=1)
