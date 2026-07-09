import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Date, ForeignKey, Integer, Numeric, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP

from app.db.base import Base


class Evento(Base):
    __tablename__ = "eventos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    establecimiento_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("establecimientos.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    fecha_evento: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_registro: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    usuario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    observaciones: Mapped[str | None] = mapped_column(Text)
    corregido_por_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("eventos.id"))
    es_correccion_de_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("eventos.id"))
    anulado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "tipo IN ('movimiento','pesaje','sanitario_vacunacion','sanitario_tratamiento',"
            "'sanitario_diagnostico','reproductivo_servicio','reproductivo_diagnostico_prenez',"
            "'reproductivo_paricion','cambio_categoria')",
            name="ck_eventos_tipo",
        ),
    )


class EventoAnimal(Base):
    __tablename__ = "eventos_animales"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evento_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("eventos.id"), nullable=False)
    animal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("animales.id"), nullable=False)
    evento_lote_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("eventos.id"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("evento_id", "animal_id", name="uq_eventos_animales"),
    )


class EventoMovimiento(Base):
    __tablename__ = "evento_movimientos"

    evento_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("eventos.id"), primary_key=True)
    tipo_movimiento: Mapped[str] = mapped_column(Text, nullable=False)
    potrero_origen_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("potreros.id"))
    potrero_destino_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("potreros.id"))
    lote_destino_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("lotes.id"))
    establecimiento_origen: Mapped[str | None] = mapped_column(Text)
    numero_guia_senacsa: Mapped[str | None] = mapped_column(Text)
    proveedor: Mapped[str | None] = mapped_column(Text)
    precio_unitario: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    tipo_precio: Mapped[str | None] = mapped_column(Text)
    moneda: Mapped[str | None] = mapped_column(Text)
    comprador: Mapped[str | None] = mapped_column(Text)
    destino_venta: Mapped[str | None] = mapped_column(Text)
    precio_venta_unitario: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    peso_venta_promedio_kg: Mapped[Decimal | None] = mapped_column(Numeric(7, 2))
    causa_muerte: Mapped[str | None] = mapped_column(Text)
    padre_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("animales.id"))

    __table_args__ = (
        CheckConstraint(
            "tipo_movimiento IN ('ingreso_compra','nacimiento','traslado_interno',"
            "'egreso_venta','egreso_faena','egreso_muerte')",
            name="ck_evento_movimientos_tipo",
        ),
    )


class EventoEconomico(Base):
    __tablename__ = "eventos_economicos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    establecimiento_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("establecimientos.id"), nullable=False)
    evento_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("eventos.id"))
    animal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("animales.id"))
    lote_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("lotes.id"))
    tipo: Mapped[str] = mapped_column(Text, nullable=False)
    monto: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    moneda: Mapped[str] = mapped_column(Text, nullable=False)
    tasa_cambio_ref: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    descripcion: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "tipo IN ('compra_animal','venta_animal','insumo_sanitario','honorario_veterinario','otro_costo')",
            name="ck_ee_tipo",
        ),
        CheckConstraint("moneda IN ('PYG','USD')", name="ck_ee_moneda"),
    )


class EventoTratamiento(Base):
    __tablename__ = "evento_tratamientos"

    evento_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("eventos.id"), primary_key=True)
    animal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("animales.id"), nullable=False)
    diagnostico: Mapped[str | None] = mapped_column(Text)
    medicamento: Mapped[str] = mapped_column(Text, nullable=False)
    dosis: Mapped[str | None] = mapped_column(Text)
    via_administracion: Mapped[str | None] = mapped_column(Text)
    duracion_dias: Mapped[int | None] = mapped_column(Integer)
    dias_carencia: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fecha_fin_carencia: Mapped[date] = mapped_column(Date, nullable=False)
    veterinario: Mapped[str | None] = mapped_column(Text)
    costo: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    moneda_costo: Mapped[str | None] = mapped_column(Text)
