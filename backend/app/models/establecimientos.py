import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP

from app.db.base import Base


class Establecimiento(Base):
    __tablename__ = "establecimientos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    departamento: Mapped[str | None] = mapped_column(Text)
    coordenadas_lat: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    coordenadas_lng: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    numero_senacsa: Mapped[str | None] = mapped_column(Text, unique=True)
    nombre_propietario: Mapped[str] = mapped_column(Text, nullable=False)
    fecha_inicio_sistema: Mapped[date] = mapped_column(Date, nullable=False)
    ejercicio_inicio_mes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=7
    )
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "ejercicio_inicio_mes between 1 and 12",
            name="ck_establecimientos_ejercicio_inicio_mes",
        ),
    )


class UsuarioEstablecimiento(Base):
    __tablename__ = "usuarios_establecimientos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False
    )
    establecimiento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("establecimientos.id", ondelete="CASCADE"),
        nullable=False,
    )
    rol: Mapped[str] = mapped_column(Text, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("user_id", "establecimiento_id", name="uq_ue_user_establecimiento"),
        CheckConstraint(
            "rol in ('propietario', 'administrador', 'veterinario')",
            name="ck_ue_rol",
        ),
    )
