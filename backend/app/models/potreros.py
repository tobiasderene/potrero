import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP

from app.db.base import Base

ESTADOS_POTRERO = ("activo", "en_descanso", "en_recuperacion", "archivado")


class Potrero(Base):
    __tablename__ = "potreros"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    establecimiento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("establecimientos.id"),
        nullable=False,
    )
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    superficie_ha: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    tipo_pastura: Mapped[str | None] = mapped_column(Text)
    capacidad_max_ug_ha: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    estado: Mapped[str] = mapped_column(Text, nullable=False, default="activo")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "estado in ('activo', 'en_descanso', 'en_recuperacion', 'archivado')",
            name="ck_potreros_estado",
        ),
        UniqueConstraint(
            "establecimiento_id", "nombre",
            name="uq_potreros_establecimiento_nombre",
        ),
    )
