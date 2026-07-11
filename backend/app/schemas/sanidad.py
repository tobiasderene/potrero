import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

VIA_ADM = Literal["subcutanea", "intramuscular", "intravenosa", "oral", "topica"]


class VacunacionInput(BaseModel):
    fecha_evento: date
    biologico: str = Field(min_length=1, max_length=200)
    laboratorio: str | None = None
    numero_lote_biologico: str | None = None
    fecha_vencimiento_biol: date | None = None
    dosis_ml: Decimal | None = Field(default=None, gt=0)
    via_administracion: VIA_ADM | None = None
    es_antiaftosa: bool = False
    animal_ids: list[uuid.UUID] | None = Field(default=None, description="IDs individuales; mutually exclusive con lote_id")
    lote_id: uuid.UUID | None = Field(default=None, description="Si se provee, vacuna todos los animales activos del lote")
    observaciones: str | None = None


class VacunacionRead(BaseModel):
    evento_id: uuid.UUID
    fecha_evento: date
    fecha_registro: datetime
    biologico: str
    laboratorio: str | None
    numero_lote_biologico: str | None
    fecha_vencimiento_biol: date | None
    dosis_ml: Decimal | None
    via_administracion: str | None
    es_antiaftosa: bool
    lote_id: uuid.UUID | None
    animal_ids: list[uuid.UUID]
    total_animales: int

    model_config = {"from_attributes": True}


class TratamientoInput(BaseModel):
    fecha_evento: date
    animal_id: uuid.UUID
    diagnostico: str | None = None
    medicamento: str = Field(min_length=1, max_length=200)
    dosis: str | None = None
    via_administracion: VIA_ADM | None = None
    duracion_dias: int | None = Field(default=None, gt=0)
    dias_carencia: int = Field(default=0, ge=0)
    veterinario: str | None = None
    costo: Decimal | None = Field(default=None, gt=0)
    moneda_costo: Literal["PYG", "USD"] | None = None
    observaciones: str | None = None


class TratamientoRead(BaseModel):
    evento_id: uuid.UUID
    fecha_evento: date
    fecha_registro: datetime
    animal_id: uuid.UUID
    diagnostico: str | None
    medicamento: str
    dosis: str | None
    via_administracion: str | None
    duracion_dias: int | None
    dias_carencia: int
    fecha_fin_carencia: date
    veterinario: str | None
    costo: Decimal | None
    moneda_costo: str | None
    observaciones: str | None

    model_config = {"from_attributes": True}


class DiagnosticoInput(BaseModel):
    fecha_evento: date
    animal_id: uuid.UUID
    descripcion: str = Field(min_length=1)
    veterinario: str | None = None
    con_tratamiento: bool = False
    observaciones: str | None = None


class DiagnosticoRead(BaseModel):
    evento_id: uuid.UUID
    fecha_evento: date
    fecha_registro: datetime
    animal_id: uuid.UUID
    descripcion: str
    veterinario: str | None
    con_tratamiento: bool
    observaciones: str | None

    model_config = {"from_attributes": True}


class CarenciaActiva(BaseModel):
    animal_id: uuid.UUID
    caravana_senacsa: str | None
    numero_campo: str | None
    medicamento: str
    fecha_fin_carencia: date
    dias_restantes: int


class ProximaAntiaftosa(BaseModel):
    animal_id: uuid.UUID
    caravana_senacsa: str | None
    numero_campo: str | None
    ultima_antiaftosa: date | None
    proxima_estimada: date | None
    dias_para_vencimiento: int | None
    estado: Literal["al_dia", "proximo", "vencido", "sin_registro"]


class CalendarioSanitarioRead(BaseModel):
    carencias_activas: list[CarenciaActiva]
    proximas_antiaftosa: list[ProximaAntiaftosa]
    total_carencias: int
    total_proximas_antiaftosa: int
