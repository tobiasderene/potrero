import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, CheckConstraint, Date, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP

from app.db.base import Base


class Animal(Base):
    __tablename__ = "animales"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    establecimiento_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("establecimientos.id"), nullable=False)
    caravana_senacsa: Mapped[str | None] = mapped_column(Text)
    numero_campo: Mapped[str | None] = mapped_column(Text)
    raza: Mapped[str | None] = mapped_column(Text)
    sexo: Mapped[str] = mapped_column(Text, nullable=False)
    fecha_nacimiento: Mapped[date | None] = mapped_column(Date)
    fecha_nacimiento_estimada: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tipo_origen: Mapped[str] = mapped_column(Text, nullable=False)
    establecimiento_origen: Mapped[str | None] = mapped_column(Text)
    madre_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    padre_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    estado: Mapped[str] = mapped_column(Text, nullable=False, default="activo")
    fecha_egreso: Mapped[date | None] = mapped_column(Date)
    tipo_egreso: Mapped[str | None] = mapped_column(Text)
    lote_actual_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    potrero_actual_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("sexo IN ('macho','hembra')", name="ck_animales_sexo"),
        CheckConstraint("tipo_origen IN ('nacido','comprado')", name="ck_animales_tipo_origen"),
        CheckConstraint("estado IN ('activo','egresado')", name="ck_animales_estado"),
        CheckConstraint("caravana_senacsa IS NOT NULL OR numero_campo IS NOT NULL", name="animal_tiene_identificacion"),
        UniqueConstraint("establecimiento_id", "caravana_senacsa", name="uq_animales_caravana"),
        UniqueConstraint("establecimiento_id", "numero_campo", name="uq_animales_numero_campo"),
    )


class AnimalCategoria(Base):
    __tablename__ = "animal_categorias"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    animal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("animales.id"), nullable=False)
    categoria: Mapped[str] = mapped_column(Text, nullable=False)
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[date | None] = mapped_column(Date)
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
