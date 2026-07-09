"""Tests del service de reportes — estructura de datos devuelta."""
import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.reportes import ReporteInventarioRead, ReporteMovimientosRead


def _row(**kwargs) -> MagicMock:
    m = MagicMock()
    for k, v in kwargs.items():
        setattr(m, k, v)
    return m


@pytest.mark.asyncio
async def test_inventario_devuelve_todos_los_animales():
    """get_inventario retorna una fila por animal activo."""
    from app.services.reportes import get_inventario

    est_id = uuid.uuid4()
    rows = [
        _row(
            id=uuid.uuid4(),
            caravana_senacsa=f"AR{i:03d}",
            numero_campo=str(i),
            sexo="macho",
            raza="Nelore",
            fecha_nacimiento=None,
            categoria="Novillo",
            potrero_nombre="Potrero A",
            lote_nombre="Invernada 1",
            coeficiente_ug=Decimal("0.70"),
        )
        for i in range(10)
    ]

    mock_result = MagicMock()
    mock_result.all.return_value = rows

    mock_est = MagicMock()
    mock_est.nombre = "Estancia Las Palmas"

    db = AsyncMock()
    db.get = AsyncMock(return_value=mock_est)
    db.execute = AsyncMock(return_value=mock_result)

    result = await get_inventario(db, est_id)

    assert isinstance(result, ReporteInventarioRead)
    assert result.total_animales == 10
    assert len(result.animales) == 10
    assert result.establecimiento_nombre == "Estancia Las Palmas"
    assert result.animales[0].categoria == "Novillo"
    assert result.animales[0].coeficiente_ug == Decimal("0.70")


@pytest.mark.asyncio
async def test_movimientos_periodo_filtra_por_fechas():
    """get_movimientos_periodo retorna movimientos dentro del rango."""
    from app.services.reportes import get_movimientos_periodo

    est_id = uuid.uuid4()
    fecha_desde = date(2026, 1, 1)
    fecha_hasta = date(2026, 6, 30)

    rows = [
        _row(
            evento_id=uuid.uuid4(),
            tipo_movimiento="egreso_venta",
            fecha_evento=date(2026, 3, 15),
            total_animales=25,
            potrero_origen="Potrero A",
            potrero_destino=None,
            proveedor_comprador="Frigorífico ABC",
            precio=Decimal("150000.00"),
            moneda="PYG",
            numero_guia_senacsa="GS-001",
        )
    ]

    mock_result = MagicMock()
    mock_result.all.return_value = rows

    mock_est = MagicMock()
    mock_est.nombre = "Estancia Don Pedro"

    db = AsyncMock()
    db.get = AsyncMock(return_value=mock_est)
    db.execute = AsyncMock(return_value=mock_result)

    result = await get_movimientos_periodo(db, est_id, fecha_desde, fecha_hasta)

    assert isinstance(result, ReporteMovimientosRead)
    assert result.total_movimientos == 1
    assert result.movimientos[0].tipo_movimiento == "egreso_venta"
    assert result.movimientos[0].total_animales == 25
    assert result.fecha_desde == fecha_desde
    assert result.fecha_hasta == fecha_hasta


@pytest.mark.asyncio
async def test_inventario_vacio():
    """get_inventario con 0 animales activos retorna lista vacía."""
    from app.services.reportes import get_inventario

    mock_result = MagicMock()
    mock_result.all.return_value = []

    mock_est = MagicMock()
    mock_est.nombre = "Estancia Vacía"

    db = AsyncMock()
    db.get = AsyncMock(return_value=mock_est)
    db.execute = AsyncMock(return_value=mock_result)

    result = await get_inventario(db, uuid.uuid4())

    assert result.total_animales == 0
    assert result.animales == []
