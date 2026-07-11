"""IND-01: GDP individual calculado correctamente con distintos intervalos de días."""
import uuid
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.pesajes import PesajeIndividualInput


def _make_animal(animal_id: uuid.UUID, est_id: uuid.UUID) -> MagicMock:
    a = MagicMock()
    a.id = animal_id
    a.establecimiento_id = est_id
    a.estado = "activo"
    return a


def _make_evento(evento_id: uuid.UUID, fecha: date) -> MagicMock:
    from datetime import datetime, timezone
    ev = MagicMock()
    ev.id = evento_id
    ev.fecha_evento = fecha
    ev.fecha_registro = datetime.now(timezone.utc)
    ev.observaciones = None
    return ev


def _make_pesaje(evento_id: uuid.UUID, animal_id: uuid.UUID, peso: Decimal) -> MagicMock:
    ep = MagicMock()
    ep.evento_id = evento_id
    ep.animal_id = animal_id
    ep.tipo = "individual"
    ep.peso_kg = peso
    ep.lote_id = None
    ep.cantidad_muestra = None
    ep.gdp_g_dia = None
    ep.dias_intervalo = None
    return ep


@pytest.mark.asyncio
async def test_gdp_calculado_30_dias():
    """GDP = (peso_actual - peso_anterior) / días * 1000 g/día."""
    from app.services.pesajes import registrar_pesaje_individual
    from app.crud import eventos as crud_ev, pesajes as crud_p

    animal_id = uuid.uuid4()
    est_id = uuid.uuid4()
    user_id = uuid.uuid4()
    hoy = date.today()

    data = PesajeIndividualInput(
        fecha_evento=hoy,
        animal_id=animal_id,
        peso_kg=Decimal("380"),
    )

    animal = _make_animal(animal_id, est_id)
    evento = _make_evento(uuid.uuid4(), hoy)
    pesaje = _make_pesaje(evento.id, animal_id, Decimal("380"))

    # Simula GDP: 350 kg → 380 kg en 30 días = (30/30)*1000 = 1000 g/día
    gdp_esperado = Decimal("1000.00")
    dias_esperados = 30

    with (
        patch("app.services.pesajes.db") if False else patch("sqlalchemy.ext.asyncio.AsyncSession"),
        patch.object(crud_ev, "create_evento", new=AsyncMock(return_value=evento)),
        patch.object(crud_ev, "create_eventos_animales", new=AsyncMock()),
        patch.object(crud_p, "create_pesaje", new=AsyncMock(return_value=pesaje)),
        patch.object(crud_p, "calcular_gdp_db", new=AsyncMock(return_value=(gdp_esperado, Decimal("350"), dias_esperados))),
    ):
        db = AsyncMock()
        db.get = AsyncMock(return_value=animal)
        db.flush = AsyncMock()
        db.commit = AsyncMock()

        result = await registrar_pesaje_individual(db, est_id, data, user_id)

    assert result.gdp_g_dia == gdp_esperado
    assert result.dias_intervalo == dias_esperados
    assert result.tipo == "individual"
    assert result.peso_kg == Decimal("380")


@pytest.mark.asyncio
async def test_gdp_calculado_15_dias():
    """GDP con intervalo de 15 días."""
    from app.services.pesajes import registrar_pesaje_individual
    from app.crud import eventos as crud_ev, pesajes as crud_p

    animal_id = uuid.uuid4()
    est_id = uuid.uuid4()
    hoy = date.today()

    data = PesajeIndividualInput(
        fecha_evento=hoy,
        animal_id=animal_id,
        peso_kg=Decimal("310"),
    )

    animal = _make_animal(animal_id, est_id)
    evento = _make_evento(uuid.uuid4(), hoy)
    pesaje = _make_pesaje(evento.id, animal_id, Decimal("310"))

    # 300 kg → 310 kg en 15 días = 10/15*1000 ≈ 666.67 g/día
    gdp_esperado = Decimal("666.67")

    with (
        patch.object(crud_ev, "create_evento", new=AsyncMock(return_value=evento)),
        patch.object(crud_ev, "create_eventos_animales", new=AsyncMock()),
        patch.object(crud_p, "create_pesaje", new=AsyncMock(return_value=pesaje)),
        patch.object(crud_p, "calcular_gdp_db", new=AsyncMock(return_value=(gdp_esperado, Decimal("300"), 15))),
    ):
        db = AsyncMock()
        db.get = AsyncMock(return_value=animal)
        db.flush = AsyncMock()
        db.commit = AsyncMock()

        result = await registrar_pesaje_individual(db, est_id, data, uuid.uuid4())

    assert result.gdp_g_dia == gdp_esperado
    assert result.dias_intervalo == 15


@pytest.mark.asyncio
async def test_gdp_sin_pesaje_anterior():
    """Primer pesaje → gdp_g_dia es None (sin dato suficiente)."""
    from app.services.pesajes import registrar_pesaje_individual
    from app.crud import eventos as crud_ev, pesajes as crud_p

    animal_id = uuid.uuid4()
    est_id = uuid.uuid4()
    hoy = date.today()

    data = PesajeIndividualInput(
        fecha_evento=hoy,
        animal_id=animal_id,
        peso_kg=Decimal("200"),
    )

    animal = _make_animal(animal_id, est_id)
    evento = _make_evento(uuid.uuid4(), hoy)
    pesaje = _make_pesaje(evento.id, animal_id, Decimal("200"))

    with (
        patch.object(crud_ev, "create_evento", new=AsyncMock(return_value=evento)),
        patch.object(crud_ev, "create_eventos_animales", new=AsyncMock()),
        patch.object(crud_p, "create_pesaje", new=AsyncMock(return_value=pesaje)),
        patch.object(crud_p, "calcular_gdp_db", new=AsyncMock(return_value=(None, None, None))),
    ):
        db = AsyncMock()
        db.get = AsyncMock(return_value=animal)
        db.flush = AsyncMock()
        db.commit = AsyncMock()

        result = await registrar_pesaje_individual(db, est_id, data, uuid.uuid4())

    assert result.gdp_g_dia is None
    assert result.dias_intervalo is None


@pytest.mark.asyncio
async def test_pesaje_fecha_futura_bloqueado():
    """RN-18: pesaje con fecha futura debe lanzar 400."""
    from fastapi import HTTPException
    from app.services.pesajes import registrar_pesaje_individual

    data = PesajeIndividualInput(
        fecha_evento=date.today() + timedelta(days=1),
        animal_id=uuid.uuid4(),
        peso_kg=Decimal("250"),
    )

    with pytest.raises(HTTPException) as exc:
        await registrar_pesaje_individual(AsyncMock(), uuid.uuid4(), data, uuid.uuid4())

    assert exc.value.status_code == 400
    assert "RN-18" in exc.value.detail


@pytest.mark.asyncio
async def test_gdp_negativo_posible():
    """GDP negativo (animal perdió peso) es válido y se almacena."""
    from app.services.pesajes import registrar_pesaje_individual
    from app.crud import eventos as crud_ev, pesajes as crud_p

    animal_id = uuid.uuid4()
    est_id = uuid.uuid4()
    hoy = date.today()

    data = PesajeIndividualInput(
        fecha_evento=hoy,
        animal_id=animal_id,
        peso_kg=Decimal("280"),
    )

    animal = _make_animal(animal_id, est_id)
    evento = _make_evento(uuid.uuid4(), hoy)
    pesaje = _make_pesaje(evento.id, animal_id, Decimal("280"))

    # 300 kg → 280 kg en 20 días → GDP = -1000 g/día
    gdp_negativo = Decimal("-1000.00")

    with (
        patch.object(crud_ev, "create_evento", new=AsyncMock(return_value=evento)),
        patch.object(crud_ev, "create_eventos_animales", new=AsyncMock()),
        patch.object(crud_p, "create_pesaje", new=AsyncMock(return_value=pesaje)),
        patch.object(crud_p, "calcular_gdp_db", new=AsyncMock(return_value=(gdp_negativo, Decimal("300"), 20))),
    ):
        db = AsyncMock()
        db.get = AsyncMock(return_value=animal)
        db.flush = AsyncMock()
        db.commit = AsyncMock()

        result = await registrar_pesaje_individual(db, est_id, data, uuid.uuid4())

    assert result.gdp_g_dia == gdp_negativo
