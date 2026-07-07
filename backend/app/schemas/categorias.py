import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

NombreCategoria = Literal[
    "ternero", "ternera", "novillo", "vaquillona",
    "toro", "vaca", "vaca_con_cria", "buey",
]


class CategoriaUpdate(BaseModel):
    coeficiente_ug: Decimal = Field(gt=0, le=10)


class CategoriaRead(BaseModel):
    id: uuid.UUID
    establecimiento_id: uuid.UUID
    nombre: str
    coeficiente_ug: Decimal
    activo: bool
    updated_at: datetime

    model_config = {"from_attributes": True}
