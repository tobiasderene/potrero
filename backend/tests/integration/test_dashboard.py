"""Tests del servicio de dashboard — IND-08, IND-05, IND-01."""
import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services import dashboard as svc


def _mock_row(**kwargs):
    r = MagicMock()
    for k, v in kwargs.items():
        setattr(r, k, v)
    return r


@pytest.mark.asyncio
async def test_stock_por_categoria_agrupado():
    """IND-08: stock agrupa correctamente por categoría y suma totales."""
    rows = [
        _mock_row(categoria="Novillo", total=50, coeficiente_ug=Decimal("0.70")),
        _mock_row(categoria="Vaca", total=30, coeficiente_ug=Decimal("1.00")),
    ]
    mock_result = MagicMock()
    mock_result.all.return_value = rows

    db = AsyncMock()
    db.execute = AsyncMock(return_value=mock_result)

    result = await svc._get_stock(db, "est-uuid")

    assert result.total_activos == 80
    assert len(result.por_categoria) == 2
    assert result.estado == "completo"
    assert result.por_categoria[0].categoria == "Novillo"
    assert result.por_categoria[0].total == 50


@pytest.mark.asyncio
async def test_stock_vacio_es_sin_dato_suficiente():
    """Stock vacío retorna estado sin_dato_suficiente."""
    mock_result = MagicMock()
    mock_result.all.return_value = []

    db = AsyncMock()
    db.execute = AsyncMock(return_value=mock_result)

    result = await svc._get_stock(db, "est-uuid")

    assert result.total_activos == 0
    assert result.estado == "sin_dato_suficiente"


@pytest.mark.asyncio
async def test_carga_establecimiento_con_superficie():
    """IND-05: carga promedio = total_ug / total_superficie."""
    row = _mock_row(total_ug=Decimal("100.00"), total_superficie_ha=Decimal("50.00"))
    mock_result = MagicMock()
    mock_result.one.return_value = row

    db = AsyncMock()
    db.execute = AsyncMock(return_value=mock_result)

    result = await svc._get_carga_establecimiento(db, "est-uuid", total_animales=100)

    assert result.total_ug == Decimal("100.00")
    assert result.carga_promedio_ug_ha == Decimal("2.00")
    assert result.estado == "completo"


@pytest.mark.asyncio
async def test_carga_sin_superficie_es_parcial():
    """Sin superficie definida, la carga es parcial."""
    row = _mock_row(total_ug=Decimal("80.00"), total_superficie_ha=Decimal("0.00"))
    mock_result = MagicMock()
    mock_result.one.return_value = row

    db = AsyncMock()
    db.execute = AsyncMock(return_value=mock_result)

    result = await svc._get_carga_establecimiento(db, "est-uuid", total_animales=80)

    assert result.carga_promedio_ug_ha is None
    assert result.estado == "parcial"


@pytest.mark.asyncio
async def test_gdp_rodeo_completo():
    """IND-01: GDP del rodeo se calcula con la query SQL optimizada."""
    row = _mock_row(
        total_con_gdp=30,
        gdp_promedio=Decimal("850.50"),
        gdp_minimo=Decimal("200.00"),
        gdp_maximo=Decimal("1200.00"),
    )
    mock_result = MagicMock()
    mock_result.one.return_value = row

    db = AsyncMock()
    db.execute = AsyncMock(return_value=mock_result)

    result = await svc._get_gdp_rodeo(db, "est-uuid", total_activos=30)

    assert result.gdp_promedio_g_dia == Decimal("850.50")
    assert result.total_animales_con_gdp == 30
    assert result.estado == "completo"


@pytest.mark.asyncio
async def test_gdp_rodeo_parcial_cuando_hay_animales_sin_pesaje():
    """Si no todos los animales tienen GDP, el estado es parcial."""
    row = _mock_row(
        total_con_gdp=10,
        gdp_promedio=Decimal("700.00"),
        gdp_minimo=Decimal("300.00"),
        gdp_maximo=Decimal("1000.00"),
    )
    mock_result = MagicMock()
    mock_result.one.return_value = row

    db = AsyncMock()
    db.execute = AsyncMock(return_value=mock_result)

    result = await svc._get_gdp_rodeo(db, "est-uuid", total_activos=50)

    assert result.estado == "parcial"
    assert result.total_animales_con_gdp == 10
    assert result.total_animales_activos == 50


@pytest.mark.asyncio
async def test_ultimos_movimientos_limit_5():
    """La query de movimientos retorna máximo 5 elementos."""
    rows = [
        _mock_row(
            evento_id=uuid.uuid4(),
            tipo_movimiento="ingreso_compra",
            fecha_evento=date.today(),
            total_animales=i + 1,
            potrero_destino_nombre=f"Potrero {i}",
            lote_destino_nombre=None,
        )
        for i in range(5)
    ]
    mock_result = MagicMock()
    mock_result.all.return_value = rows

    db = AsyncMock()
    db.execute = AsyncMock(return_value=mock_result)

    result = await svc._get_ultimos_movimientos(db, "est-uuid")

    assert len(result) == 5
    assert result[0].tipo_movimiento == "ingreso_compra"
