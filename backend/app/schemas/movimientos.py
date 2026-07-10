import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

TIPOS_MOVIMIENTO = ("ingreso_compra", "nacimiento", "traslado_interno", "egreso_venta", "egreso_faena", "egreso_muerte")
DESTINOS_VENTA = ("frigorifico", "remate", "venta_directa")
MONEDAS = ("PYG", "USD")


class AnimalCompraItem(BaseModel):
    """Un animal individual dentro de un ingreso por compra."""
    caravana_senacsa: str | None = Field(default=None, min_length=1, max_length=50)
    numero_campo: str | None = Field(default=None, min_length=1, max_length=50)
    sexo: Literal["macho", "hembra"]
    categoria: str
    raza: str | None = Field(default=None, max_length=100)
    fecha_nacimiento: date | None = None
    fecha_nacimiento_estimada: bool = False
    establecimiento_origen_animal: str | None = None
    peso_kg: Decimal | None = Field(default=None, gt=0)

    def validate_identificacion(self):
        if not self.caravana_senacsa and not self.numero_campo:
            raise ValueError("Cada animal debe tener al menos caravana_senacsa o numero_campo")


class IngresoCompraInput(BaseModel):
    fecha_evento: date
    animales: list[AnimalCompraItem] = Field(min_length=1)
    potrero_destino_id: uuid.UUID | None = None
    lote_destino_id: uuid.UUID | None = None
    proveedor: str | None = Field(default=None, max_length=200)
    establecimiento_origen: str | None = Field(default=None, max_length=200)
    numero_guia_senacsa: str | None = Field(default=None, max_length=50)
    precio_unitario: Decimal | None = Field(default=None, gt=0)
    tipo_precio: Literal["por_cabeza", "por_kg"] | None = None
    moneda: Literal["PYG", "USD"] | None = None
    observaciones: str | None = None


class NacimientoInput(BaseModel):
    fecha_evento: date
    madre_id: uuid.UUID
    padre_id: uuid.UUID | None = None
    sexo: Literal["macho", "hembra"]
    fecha_nacimiento: date
    fecha_nacimiento_estimada: bool = False
    raza: str | None = Field(default=None, max_length=100)
    numero_campo: str | None = Field(default=None, min_length=1, max_length=50)
    caravana_senacsa: str | None = Field(default=None, min_length=1, max_length=50)
    potrero_destino_id: uuid.UUID | None = None
    lote_destino_id: uuid.UUID | None = None
    observaciones: str | None = None


class TrasladoInternoInput(BaseModel):
    fecha_evento: date
    animal_ids: list[uuid.UUID] | None = Field(default=None, min_length=1)
    lote_id: uuid.UUID | None = None
    potrero_destino_id: uuid.UUID
    observaciones: str | None = None

    @model_validator(mode="after")
    def _validar_origen(self) -> "TrasladoInternoInput":
        if not self.animal_ids and not self.lote_id:
            raise ValueError("Debe especificar animal_ids o lote_id")
        if self.animal_ids and self.lote_id:
            raise ValueError("No puede especificar animal_ids y lote_id simultáneamente")
        return self


class EgresoVentaInput(BaseModel):
    fecha_evento: date
    animal_ids: list[uuid.UUID] = Field(min_length=1)
    comprador: str | None = Field(default=None, max_length=200)
    destino_venta: Literal["frigorifico", "remate", "venta_directa"] | None = None
    precio_venta_unitario: Decimal | None = Field(default=None, gt=0)
    peso_venta_promedio_kg: Decimal | None = Field(default=None, gt=0)
    moneda: Literal["PYG", "USD"] | None = None
    numero_guia_senacsa: str | None = Field(default=None, max_length=50)
    observaciones: str | None = None


class EgresoMuerteInput(BaseModel):
    fecha_evento: date
    animal_id: uuid.UUID
    causa_muerte: str | None = Field(default=None, max_length=300)
    observaciones: str | None = None


class CarenciaInfo(BaseModel):
    animal_id: uuid.UUID
    fecha_fin_carencia: date
    medicamento: str


class MovimientoRead(BaseModel):
    evento_id: uuid.UUID
    tipo_movimiento: str
    fecha_evento: date
    fecha_registro: datetime
    observaciones: str | None
    animal_ids: list[uuid.UUID]
    potrero_origen_id: uuid.UUID | None = None
    potrero_destino_id: uuid.UUID | None = None
    lote_destino_id: uuid.UUID | None = None
    proveedor: str | None = None
    establecimiento_origen: str | None = None
    numero_guia_senacsa: str | None = None
    precio_unitario: Decimal | None = None
    tipo_precio: str | None = None
    moneda: str | None = None
    comprador: str | None = None
    destino_venta: str | None = None
    precio_venta_unitario: Decimal | None = None
    peso_venta_promedio_kg: Decimal | None = None
    causa_muerte: str | None = None
    advertencias: list[str] = []

    model_config = {"from_attributes": True}


class CargaAnimalRead(BaseModel):
    potrero_id: uuid.UUID
    potrero_nombre: str
    superficie_ha: Decimal | None
    capacidad_max_ug_ha: Decimal | None
    capacidad_total_ug: Decimal | None
    carga_actual_ug: Decimal
    total_animales: int
    porcentaje_ocupacion: Decimal | None
    estado_carga: Literal["completo", "parcial", "sin_dato_suficiente"]
    semaforo: Literal["verde", "amarillo", "rojo"] | None
