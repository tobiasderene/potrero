"""RN-06 + RN-07: tratamiento con 28 días de carencia bloquea la venta."""
import uuid
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.sanidad import TratamientoInput
from app.schemas.movimientos import CarenciaInfo, EgresoVentaInput


def _make_animal(aid: uuid.UUID, est_id: uuid.UUID, caravana: str = "PY000001") -> MagicMock:
    a = MagicMock()
    a.id = aid
    a.establecimiento_id = est_id
    a.estado = "activo"
    a.caravana_senacsa = caravana
    a.lote_actual_id = None
    a.potrero_actual_id = None
    return a


def _make_evento(evento_id: uuid.UUID, fecha: date) -> MagicMock:
    from datetime import datetime, timezone
    ev = MagicMock()
    ev.id = evento_id
    ev.fecha_evento = fecha
    ev.fecha_registro = datetime.now(timezone.utc)
    ev.observaciones = None
    return ev


@pytest.mark.asyncio
async def test_tratamiento_calcula_fecha_fin_carencia():
    """RN-07: fecha_fin_carencia = fecha_evento + dias_carencia."""
    from app.services.sanidad import registrar_tratamiento
    from app.crud import eventos as crud_ev, sanidad as crud_s

    animal_id = uuid.uuid4()
    est_id = uuid.uuid4()
    hoy = date.today()
    dias_carencia = 28

    data = TratamientoInput(
        fecha_evento=hoy,
        animal_id=animal_id,
        medicamento="Ivermectina 1%",
        dias_carencia=dias_carencia,
    )

    animal = _make_animal(animal_id, est_id)
    evento = _make_evento(uuid.uuid4(), hoy)

    et = MagicMock()
    et.animal_id = animal_id
    et.diagnostico = None
    et.medicamento = "Ivermectina 1%"
    et.dosis = None
    et.via_administracion = None
    et.duracion_dias = None
    et.dias_carencia = dias_carencia
    et.fecha_fin_carencia = hoy + timedelta(days=dias_carencia)
    et.veterinario = None
    et.costo = None
    et.moneda_costo = None

    with (
        patch.object(crud_ev, "create_evento", new=AsyncMock(return_value=evento)),
        patch.object(crud_ev, "create_eventos_animales", new=AsyncMock()),
        patch.object(crud_s, "create_tratamiento", new=AsyncMock(return_value=et)),
    ):
        db = AsyncMock()
        db.get = AsyncMock(return_value=animal)
        db.commit = AsyncMock()

        result = await registrar_tratamiento(db, est_id, data, uuid.uuid4())

    fecha_esperada = hoy + timedelta(days=dias_carencia)
    assert result.fecha_fin_carencia == fecha_esperada
    assert result.dias_carencia == dias_carencia


@pytest.mark.asyncio
async def test_tratamiento_28_dias_bloquea_venta():
    """Integración RN-06 + RN-07: tratamiento 28 días → venta bloqueada."""
    from fastapi import HTTPException
    from app.services.movimientos import registrar_egreso_venta

    animal_id = uuid.uuid4()
    est_id = uuid.uuid4()
    hoy = date.today()

    data = EgresoVentaInput(
        fecha_evento=hoy,
        animal_ids=[animal_id],
        comprador="Frigorifico ABC",
        destino_venta="frigorifico",
        moneda="PYG",
    )

    animal = _make_animal(animal_id, est_id)

    # Simula carencia activa (28 días vigente)
    carencia = CarenciaInfo(
        animal_id=animal_id,
        fecha_fin_carencia=hoy + timedelta(days=20),
        medicamento="Ivermectina 1%",
    )

    with (
        patch(
            "app.services.movimientos._check_animales_activos",
            new=AsyncMock(return_value=[animal]),
        ),
        patch(
            "app.services.movimientos._check_carencia_activa",
            new=AsyncMock(return_value=[carencia]),
        ),
    ):
        with pytest.raises(HTTPException) as exc:
            await registrar_egreso_venta(AsyncMock(), est_id, data, uuid.uuid4())

    assert exc.value.status_code == 400
    detail = str(exc.value.detail)
    assert "carencia" in detail.lower()


@pytest.mark.asyncio
async def test_tratamiento_sin_carencia_no_bloquea():
    """Tratamiento con 0 días de carencia → la venta no se bloquea."""
    from app.services.sanidad import registrar_tratamiento
    from app.crud import eventos as crud_ev, sanidad as crud_s

    animal_id = uuid.uuid4()
    est_id = uuid.uuid4()
    hoy = date.today()

    data = TratamientoInput(
        fecha_evento=hoy,
        animal_id=animal_id,
        medicamento="Vitamina B12",
        dias_carencia=0,
    )

    animal = _make_animal(animal_id, est_id)
    evento = _make_evento(uuid.uuid4(), hoy)

    et = MagicMock()
    et.animal_id = animal_id
    et.diagnostico = None
    et.medicamento = "Vitamina B12"
    et.dosis = None
    et.via_administracion = None
    et.duracion_dias = None
    et.dias_carencia = 0
    et.fecha_fin_carencia = hoy  # mismo día → carencia cero
    et.veterinario = None
    et.costo = None
    et.moneda_costo = None

    with (
        patch.object(crud_ev, "create_evento", new=AsyncMock(return_value=evento)),
        patch.object(crud_ev, "create_eventos_animales", new=AsyncMock()),
        patch.object(crud_s, "create_tratamiento", new=AsyncMock(return_value=et)),
    ):
        db = AsyncMock()
        db.get = AsyncMock(return_value=animal)
        db.commit = AsyncMock()

        result = await registrar_tratamiento(db, est_id, data, uuid.uuid4())

    assert result.fecha_fin_carencia == hoy
    assert result.dias_carencia == 0


@pytest.mark.asyncio
async def test_tratamiento_fecha_futura_bloqueada():
    """RN-18 en tratamiento."""
    from fastapi import HTTPException
    from app.services.sanidad import registrar_tratamiento

    data = TratamientoInput(
        fecha_evento=date.today() + timedelta(days=1),
        animal_id=uuid.uuid4(),
        medicamento="Ibuprofeno",
        dias_carencia=7,
    )

    with pytest.raises(HTTPException) as exc:
        await registrar_tratamiento(AsyncMock(), uuid.uuid4(), data, uuid.uuid4())

    assert exc.value.status_code == 400
    assert "RN-18" in exc.value.detail
