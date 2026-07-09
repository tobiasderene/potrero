import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class PesajeIndividualInput(BaseModel):
    fecha_evento: date
    animal_id: uuid.UUID
    peso_kg: Decimal = Field(gt=0)
    observaciones: str | None = None


class PesajeLoteInput(BaseModel):
    fecha_evento: date
    lote_id: uuid.UUID
    peso_kg: Decimal = Field(gt=0, description="Peso promedio estimado del lote")
    cantidad_muestra: int = Field(gt=0, description="Cantidad de animales pesados en la muestra")
    observaciones: str | None = None


class PesajeRead(BaseModel):
    evento_id: uuid.UUID
    fecha_evento: date
    fecha_registro: datetime
    tipo: Literal["individual", "lote_estimado"]
    animal_id: uuid.UUID | None = None
    lote_id: uuid.UUID | None = None
    peso_kg: Decimal
    cantidad_muestra: int | None = None
    gdp_g_dia: Decimal | None = None
    dias_intervalo: int | None = None
    observaciones: str | None = None

    model_config = {"from_attributes": True}


class GdpAnimalRead(BaseModel):
    animal_id: uuid.UUID
    gdp_g_dia: Decimal | None
    peso_anterior_kg: Decimal | None
    dias_intervalo: int | None
    estado: Literal["completo", "sin_dato_suficiente"]


class GdpLoteRead(BaseModel):
    lote_id: uuid.UUID
    gdp_promedio_g_dia: Decimal | None
    gdp_minimo_g_dia: Decimal | None
    gdp_maximo_g_dia: Decimal | None
    total_animales_con_gdp: int
    total_animales_lote: int
    estado: Literal["completo", "parcial", "sin_dato_suficiente"]


class VariacionGdpRead(BaseModel):
    animal_id: uuid.UUID
    gdp_animal_g_dia: Decimal | None
    gdp_promedio_lote_g_dia: Decimal | None
    porcentaje_vs_promedio: Decimal | None
    alerta_bajo: bool
    estado: Literal["completo", "parcial", "sin_dato_suficiente"]
