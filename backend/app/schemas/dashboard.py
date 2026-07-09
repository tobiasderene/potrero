import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


class StockCategoriaRead(BaseModel):
    categoria: str
    total: int
    coeficiente_ug: Decimal | None


class StockRead(BaseModel):
    por_categoria: list[StockCategoriaRead]
    total_activos: int
    estado: Literal["completo", "sin_dato_suficiente"]


class CargaEstablecimientoRead(BaseModel):
    total_ug: Decimal
    total_animales: int
    total_superficie_ha: Decimal | None
    carga_promedio_ug_ha: Decimal | None
    estado: Literal["completo", "parcial", "sin_dato_suficiente"]


class GdpRodeoRead(BaseModel):
    gdp_promedio_g_dia: Decimal | None
    gdp_minimo_g_dia: Decimal | None
    gdp_maximo_g_dia: Decimal | None
    total_animales_con_gdp: int
    total_animales_activos: int
    estado: Literal["completo", "parcial", "sin_dato_suficiente"]


class MovimientoResumenRead(BaseModel):
    evento_id: uuid.UUID
    tipo_movimiento: str
    fecha_evento: date
    total_animales: int
    potrero_destino_nombre: str | None
    lote_destino_nombre: str | None


class DashboardRead(BaseModel):
    fecha_consulta: date
    stock: StockRead
    carga_establecimiento: CargaEstablecimientoRead
    gdp_rodeo: GdpRodeoRead
    ultimos_movimientos: list[MovimientoResumenRead]
