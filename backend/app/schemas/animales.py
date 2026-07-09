import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

CATEGORIAS_VALIDAS = ("ternero", "ternera", "novillo", "vaquillona", "vaca", "vaca_con_cria", "toro", "buey")


class AnimalCreate(BaseModel):
    caravana_senacsa: str | None = Field(default=None, min_length=1, max_length=50)
    numero_campo: str | None = Field(default=None, min_length=1, max_length=50)
    sexo: Literal["macho", "hembra"]
    tipo_origen: Literal["nacido", "comprado"]
    categoria: str
    raza: str | None = Field(default=None, max_length=100)
    fecha_nacimiento: date | None = None
    fecha_nacimiento_estimada: bool = False
    establecimiento_origen: str | None = Field(default=None, max_length=200)
    potrero_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def validar(self):
        if not self.caravana_senacsa and not self.numero_campo:
            raise ValueError("Debe tener al menos caravana_senacsa o numero_campo")
        if self.categoria not in CATEGORIAS_VALIDAS:
            raise ValueError(f"Categoria invalida. Use uno de: {', '.join(CATEGORIAS_VALIDAS)}")
        return self


class AnimalUpdate(BaseModel):
    caravana_senacsa: str | None = Field(default=None, min_length=1, max_length=50)
    numero_campo: str | None = Field(default=None, min_length=1, max_length=50)
    raza: str | None = Field(default=None, max_length=100)
    fecha_nacimiento: date | None = None
    fecha_nacimiento_estimada: bool | None = None
    establecimiento_origen: str | None = Field(default=None, max_length=200)


class AnimalRead(BaseModel):
    id: uuid.UUID
    establecimiento_id: uuid.UUID
    caravana_senacsa: str | None
    numero_campo: str | None
    sexo: str
    tipo_origen: str
    raza: str | None
    fecha_nacimiento: date | None
    fecha_nacimiento_estimada: bool
    establecimiento_origen: str | None
    estado: str
    fecha_egreso: date | None
    tipo_egreso: str | None
    lote_actual_id: uuid.UUID | None
    lote_actual_nombre: str | None = None
    potrero_actual_id: uuid.UUID | None
    categoria_actual: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CambioCategoria(BaseModel):
    categoria: str

    @model_validator(mode="after")
    def validar(self):
        if self.categoria not in CATEGORIAS_VALIDAS:
            raise ValueError(f"Categoria invalida. Use uno de: {', '.join(CATEGORIAS_VALIDAS)}")
        return self
