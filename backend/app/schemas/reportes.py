import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class AnimalInventarioRow(BaseModel):
    id: uuid.UUID
    caravana_senacsa: str | None
    numero_campo: str | None
    sexo: str
    raza: str | None
    fecha_nacimiento: date | None
    categoria: str
    potrero_nombre: str | None
    lote_nombre: str | None
    coeficiente_ug: Decimal


class ReporteInventarioRead(BaseModel):
    establecimiento_nombre: str
    fecha_consulta: date
    total_animales: int
    animales: list[AnimalInventarioRow]


class MovimientoReporteRow(BaseModel):
    evento_id: uuid.UUID
    tipo_movimiento: str
    fecha_evento: date
    total_animales: int
    potrero_origen: str | None
    potrero_destino: str | None
    proveedor_comprador: str | None
    precio: Decimal | None
    moneda: str | None
    numero_guia_senacsa: str | None


class ReporteMovimientosRead(BaseModel):
    establecimiento_nombre: str
    fecha_desde: date
    fecha_hasta: date
    total_movimientos: int
    movimientos: list[MovimientoReporteRow]
