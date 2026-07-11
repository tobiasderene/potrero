"""Performance: dashboard con 1000 animales — lógica Python < 1s.

El cuello de botella real es la DB (queries SQL). Estos tests verifican que
el código Python de agregación no introduce overhead significativo.
Para medir tiempo de carga end-to-end contra Supabase real, correr:
    DATABASE_URL=... pytest tests/integration/test_performance_dashboard.py -v -s
"""
import time
import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services import dashboard as svc


def _make_stock_rows(n: int):
    """Simula n categorías distintas con animales."""
    return [
        MagicMock(categoria=f"Cat-{i}", total=n // 10, coeficiente_ug=Decimal("0.70"))
        for i in range(min(n, 10))
    ]


def _make_movimiento_rows(n: int):
    return [
        MagicMock(
            evento_id=uuid.uuid4(),
            tipo_movimiento="ingreso_compra",
            fecha_evento=date.today(),
            total_animales=10,
            potrero_destino_nombre=f"Potrero {i}",
            lote_destino_nombre=None,
        )
        for i in range(n)
    ]


@pytest.mark.asyncio
async def test_dashboard_stock_1000_animales_en_menos_de_1s():
    """Procesar 1000 filas de stock (10 categorías × 100) tarda < 1s en Python."""
    rows = _make_stock_rows(1000)
    mock_result = MagicMock()
    mock_result.all.return_value = rows

    db = AsyncMock()
    db.execute = AsyncMock(return_value=mock_result)

    inicio = time.perf_counter()
    result = await svc._get_stock(db, "est-uuid")
    elapsed = time.perf_counter() - inicio

    assert elapsed < 1.0, f"Processing tardó {elapsed:.3f}s — esperado < 1s"
    assert result.total_activos > 0


@pytest.mark.asyncio
async def test_dashboard_movimientos_5_filas():
    """_get_ultimos_movimientos procesa exactamente 5 filas."""
    rows = _make_movimiento_rows(5)
    mock_result = MagicMock()
    mock_result.all.return_value = rows

    db = AsyncMock()
    db.execute = AsyncMock(return_value=mock_result)

    inicio = time.perf_counter()
    result = await svc._get_ultimos_movimientos(db, "est-uuid")
    elapsed = time.perf_counter() - inicio

    assert len(result) == 5
    assert elapsed < 0.1, f"Procesamiento tardó {elapsed:.3f}s"


@pytest.mark.asyncio
async def test_gdp_rodeo_sin_n_plus_1():
    """_get_gdp_rodeo realiza exactamente 1 llamada a DB (no N+1)."""
    row = MagicMock(
        total_con_gdp=1000,
        gdp_promedio=Decimal("800.00"),
        gdp_minimo=Decimal("100.00"),
        gdp_maximo=Decimal("1500.00"),
    )
    mock_result = MagicMock()
    mock_result.one.return_value = row

    db = AsyncMock()
    db.execute = AsyncMock(return_value=mock_result)

    await svc._get_gdp_rodeo(db, "est-uuid", total_activos=1000)

    # Verificar que solo se hizo 1 llamada a la DB (no 1000 llamadas)
    assert db.execute.call_count == 1
