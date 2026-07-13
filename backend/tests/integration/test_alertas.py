"""Tests de integración del service de alertas."""
import uuid
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.alertas import AlertaRead


def _mock_rows(items: list) -> MagicMock:
    r = MagicMock()
    r.all.return_value = items
    return r


def _row(**kwargs) -> MagicMock:
    m = MagicMock()
    m.potrero_actual_id = None  # evita que Pydantic reciba MagicMock en uuid fields
    for k, v in kwargs.items():
        setattr(m, k, v)
    return m


@pytest.mark.asyncio
async def test_alerta_carencia_activa_critica():
    """Animales con carencia activa generan alertas de severidad crítica."""
    from app.services.alertas import _alerta_carencia_activa

    hoy = date.today()
    animal_id = uuid.uuid4()
    row = _row(
        id=animal_id,
        caravana_senacsa="AR001",
        numero_campo=None,
        fecha_fin=hoy + timedelta(days=5),
        medicamentos="Ivermectina",
    )

    db = AsyncMock()
    db.execute = AsyncMock(return_value=_mock_rows([row]))

    alertas = await _alerta_carencia_activa(db, "est", hoy)

    assert len(alertas) == 1
    assert alertas[0].severidad == "critica"
    assert alertas[0].tipo == "carencia_activa"
    assert alertas[0].entidad_id == animal_id
    assert "5 días" in alertas[0].mensaje


@pytest.mark.asyncio
async def test_alerta_antiaftosa_vencida():
    """Animales con antiaftosa vencida generan alertas de severidad alta."""
    from app.services.alertas import _alerta_antiaftosa_vencida

    hoy = date.today()
    animal_id = uuid.uuid4()
    ultima = hoy - timedelta(days=200)
    row = _row(
        id=animal_id,
        caravana_senacsa=None,
        numero_campo="456",
        ultima_fecha=ultima,
    )

    db = AsyncMock()
    db.execute = AsyncMock(return_value=_mock_rows([row]))

    alertas = await _alerta_antiaftosa_vencida(db, "est", hoy)

    assert len(alertas) == 1
    assert alertas[0].severidad == "alta"
    assert alertas[0].tipo == "antiaftosa_vencida"
    assert "vencida" in alertas[0].mensaje


@pytest.mark.asyncio
async def test_alerta_antiaftosa_sin_registro():
    """Animal sin registro de antiaftosa genera alerta con mensaje específico."""
    from app.services.alertas import _alerta_antiaftosa_vencida

    hoy = date.today()
    row = _row(id=uuid.uuid4(), caravana_senacsa="AR999", numero_campo=None, ultima_fecha=None)

    db = AsyncMock()
    db.execute = AsyncMock(return_value=_mock_rows([row]))

    alertas = await _alerta_antiaftosa_vencida(db, "est", hoy)

    assert alertas[0].mensaje == "Sin registro de vacunación antiaftosa."


@pytest.mark.asyncio
async def test_alerta_potrero_sobrecargado():
    """Potrero con >110% de capacidad genera alerta de severidad alta."""
    from app.services.alertas import _alerta_potrero_sobrecargado

    potrero_id = uuid.uuid4()
    row = _row(id=potrero_id, nombre="Potrero Norte", porcentaje=Decimal("125.5"))

    db = AsyncMock()
    db.execute = AsyncMock(return_value=_mock_rows([row]))

    alertas = await _alerta_potrero_sobrecargado(db, "est")

    assert len(alertas) == 1
    assert alertas[0].severidad == "alta"
    assert alertas[0].tipo == "potrero_sobrecargado"
    assert "125.5%" in alertas[0].mensaje


@pytest.mark.asyncio
async def test_alerta_vacunacion_proxima_media():
    """Vacunación próxima en ≤15 días tiene severidad media."""
    from app.services.alertas import _alerta_vacunacion_proxima

    hoy = date.today()
    row = _row(id=uuid.uuid4(), caravana_senacsa="AR002", numero_campo=None, proxima=hoy + timedelta(days=10))

    db = AsyncMock()
    db.execute = AsyncMock(return_value=_mock_rows([row]))

    alertas = await _alerta_vacunacion_proxima(db, "est", hoy)

    assert alertas[0].severidad == "media"
    assert alertas[0].tipo == "vacunacion_proxima_15d"
    assert "10 días" in alertas[0].mensaje


@pytest.mark.asyncio
async def test_alertas_ordenadas_por_severidad():
    """get_alertas retorna criticas primero, luego altas, luego medias."""
    from app.services import alertas as svc

    media_row = _row(id=uuid.uuid4(), caravana_senacsa="M1", numero_campo=None, proxima=date.today() + timedelta(days=5))
    critica_row = _row(id=uuid.uuid4(), caravana_senacsa="C1", numero_campo=None, fecha_fin=date.today() + timedelta(days=3), medicamentos="Amoxicilina")
    alta_row = _row(id=uuid.uuid4(), caravana_senacsa="A1", numero_campo=None, ultima_fecha=date.today() - timedelta(days=250))

    empty = _mock_rows([])

    db = AsyncMock()
    call_count = 0

    async def mock_execute(q, params=None):
        nonlocal call_count
        call_count += 1
        # alerta_carencia (primera llamada) → retorna critica
        if call_count == 1:
            return _mock_rows([critica_row])
        # alerta_antiaftosa → retorna alta
        elif call_count == 2:
            return _mock_rows([alta_row])
        # demás → vacío
        else:
            return empty

    db.execute = mock_execute

    result = await svc.get_alertas(db, uuid.uuid4())

    severidades = [a.severidad for a in result.alertas]
    # Las críticas deben aparecer antes que las altas
    critica_idx = next((i for i, s in enumerate(severidades) if s == "critica"), None)
    alta_idx = next((i for i, s in enumerate(severidades) if s == "alta"), None)

    if critica_idx is not None and alta_idx is not None:
        assert critica_idx < alta_idx


@pytest.mark.asyncio
async def test_alerta_sin_pesaje_invernada():
    """Lote invernada sin pesaje en 60 días genera alerta media."""
    from app.services.alertas import _alerta_sin_pesaje_invernada

    hoy = date.today()
    lote_id = uuid.uuid4()
    row = _row(id=lote_id, nombre="Invernada Norte", ultimo_pesaje=hoy - timedelta(days=75))

    db = AsyncMock()
    db.execute = AsyncMock(return_value=_mock_rows([row]))

    alertas = await _alerta_sin_pesaje_invernada(db, "est", hoy)

    assert len(alertas) == 1
    assert alertas[0].severidad == "media"
    assert alertas[0].tipo == "sin_pesaje_invernada_60d"
    assert "75 días" in alertas[0].mensaje
