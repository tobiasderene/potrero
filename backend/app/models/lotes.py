import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP

from app.db.base import Base


class Lote(Base):
    __tablename__ = "lotes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    establecimiento_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("establecimientos.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    proposito: Mapped[str] = mapped_column(Text, nullable=False)
    potrero_principal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("potreros.id"))
    fecha_formacion: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_cierre: Mapped[date | None] = mapped_column(Date)
    peso_promedio_ingreso: Mapped[Decimal | None] = mapped_column(Numeric(7, 2))
    peso_objetivo_salida: Mapped[Decimal | None] = mapped_column(Numeric(7, 2))
    plazo_estimado_dias: Mapped[int | None] = mapped_column(Integer)
    estado: Mapped[str] = mapped_column(Text, nullable=False, default="activo")
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "proposito IN ('invernada','cria','recria','reproduccion')",
            name="ck_lotes_proposito",
        ),
        CheckConstraint(
            "estado IN ('activo','cerrado')",
            name="ck_lotes_estado",
        ),
    )
