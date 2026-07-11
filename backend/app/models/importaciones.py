import uuid
from datetime import datetime

from sqlalchemy import Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy import TIMESTAMP

from app.db.base import Base


class Importacion(Base):
    __tablename__ = "importaciones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    establecimiento_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    usuario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    nombre_archivo: Mapped[str] = mapped_column(Text, nullable=False)
    total_filas: Mapped[int | None] = mapped_column(Integer)
    filas_exitosas: Mapped[int | None] = mapped_column(Integer)
    filas_con_error: Mapped[int | None] = mapped_column(Integer)
    estado: Mapped[str] = mapped_column(Text, nullable=False, default="procesando")
    reporte_errores: Mapped[list | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    completado_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
