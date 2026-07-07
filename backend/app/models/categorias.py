import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Numeric, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP

from app.db.base import Base

CATEGORIAS_VALIDAS = (
    "ternero", "ternera", "novillo", "vaquillona",
    "toro", "vaca", "vaca_con_cria", "buey",
)


class Categoria(Base):
    __tablename__ = "categorias"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    establecimiento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("establecimientos.id"),
        nullable=False,
    )
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    coeficiente_ug: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            f"nombre in {CATEGORIAS_VALIDAS!r}".replace("[", "(").replace("]", ")"),
            name="ck_categorias_nombre",
        ),
        UniqueConstraint(
            "establecimiento_id", "nombre",
            name="uq_categorias_establecimiento_nombre",
        ),
    )
