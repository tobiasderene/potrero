import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator


class EstablecimientoCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    nombre_propietario: str = Field(min_length=1, max_length=200)
    fecha_inicio_sistema: date
    departamento: str | None = None
    coordenadas_lat: Decimal | None = Field(default=None, ge=-90, le=90)
    coordenadas_lng: Decimal | None = Field(default=None, ge=-180, le=180)
    numero_senacsa: str | None = None
    ejercicio_inicio_mes: int = Field(default=7, ge=1, le=12)


class EstablecimientoUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=200)
    nombre_propietario: str | None = Field(default=None, min_length=1, max_length=200)
    departamento: str | None = None
    coordenadas_lat: Decimal | None = Field(default=None, ge=-90, le=90)
    coordenadas_lng: Decimal | None = Field(default=None, ge=-180, le=180)
    numero_senacsa: str | None = None
    ejercicio_inicio_mes: int | None = Field(default=None, ge=1, le=12)


class EstablecimientoRead(BaseModel):
    id: uuid.UUID
    nombre: str
    nombre_propietario: str
    fecha_inicio_sistema: date
    departamento: str | None
    coordenadas_lat: Decimal | None
    coordenadas_lng: Decimal | None
    numero_senacsa: str | None
    ejercicio_inicio_mes: int
    activo: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UsuarioEstablecimientoRead(BaseModel):
    establecimiento: EstablecimientoRead
    rol: str
    user_id: uuid.UUID

    model_config = {"from_attributes": True}
