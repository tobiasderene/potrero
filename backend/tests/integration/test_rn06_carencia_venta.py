"""RN-06/RN-08: venta bloqueada si animal tiene carencia activa."""
import uuid
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.movimientos import CarenciaInfo, EgresoVentaInput


@pytest.mark.asyncio
async def test_egreso_venta_bloqueado_por_carencia():
    """El service debe lanzar HTTPException 400 si algún animal tiene carencia activa."""
    from fastapi import HTTPException
    from app.services.movimientos import registrar_egreso_venta

    animal_id = uuid.uuid4()
    est_id = uuid.uuid4()
    user_id = uuid.uuid4()
    hoy = date.today()

    data = EgresoVentaInput(
        fecha_evento=hoy,
        animal_ids=[animal_id],
        comprador="Frigorifico X",
        destino_venta="frigorifico",
        moneda="PYG",
    )

    from unittest.mock import MagicMock

    animal = MagicMock()
    animal.id = animal_id
    animal.establecimiento_id = est_id
    animal.estado = "activo"
    animal.caravana_senacsa = "PY000001"
    animal.lote_actual_id = None
    animal.potrero_actual_id = None

    carencia = CarenciaInfo(
        animal_id=animal_id,
        fecha_fin_carencia=hoy + timedelta(days=5),
        medicamento="Ivermectina",
    )

    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [animal]
    db.execute = AsyncMock(return_value=mock_result)

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
            await registrar_egreso_venta(db, est_id, data, user_id)

    assert exc.value.status_code == 400
    detail = exc.value.detail
    assert "carencia" in str(detail).lower()


@pytest.mark.asyncio
async def test_egreso_venta_bloqueado_sin_caravana():
    """RN-04: animales sin caravana SENACSA no pueden tener egresos externos."""
    from fastapi import HTTPException
    from app.services.movimientos import registrar_egreso_venta

    animal_id = uuid.uuid4()
    est_id = uuid.uuid4()
    user_id = uuid.uuid4()
    hoy = date.today()

    data = EgresoVentaInput(
        fecha_evento=hoy,
        animal_ids=[animal_id],
        destino_venta="frigorifico",
        moneda="PYG",
    )

    from unittest.mock import MagicMock

    animal = MagicMock()
    animal.id = animal_id
    animal.establecimiento_id = est_id
    animal.estado = "activo"
    animal.caravana_senacsa = None  # sin caravana
    animal.lote_actual_id = None
    animal.potrero_actual_id = None

    with patch(
        "app.services.movimientos._check_animales_activos",
        new=AsyncMock(return_value=[animal]),
    ):
        with pytest.raises(HTTPException) as exc:
            await registrar_egreso_venta(db=AsyncMock(), establecimiento_id=est_id, data=data, user_id=user_id)

    assert exc.value.status_code == 400
    assert "RN-04" in str(exc.value.detail)


@pytest.mark.asyncio
async def test_egreso_venta_bloqueado_fecha_futura():
    """RN-18: fecha futura debe ser bloqueada."""
    from fastapi import HTTPException
    from app.services.movimientos import registrar_egreso_venta
    from datetime import timedelta

    data = EgresoVentaInput(
        fecha_evento=date.today() + timedelta(days=1),
        animal_ids=[uuid.uuid4()],
        moneda="PYG",
    )

    with pytest.raises(HTTPException) as exc:
        await registrar_egreso_venta(AsyncMock(), uuid.uuid4(), data, uuid.uuid4())

    assert exc.value.status_code == 400
    assert "RN-18" in exc.value.detail


@pytest.mark.asyncio
async def test_egreso_venta_sin_carencia_pasa():
    """Venta sin carencia y con caravana debe proceder sin error."""
    from app.services.movimientos import registrar_egreso_venta

    animal_id = uuid.uuid4()
    est_id = uuid.uuid4()
    user_id = uuid.uuid4()
    hoy = date.today()

    data = EgresoVentaInput(
        fecha_evento=hoy,
        animal_ids=[animal_id],
        destino_venta="frigorifico",
        moneda="PYG",
    )

    from unittest.mock import MagicMock
    from datetime import datetime, timezone
    from app.crud import eventos as crud_ev

    animal = MagicMock()
    animal.id = animal_id
    animal.establecimiento_id = est_id
    animal.estado = "activo"
    animal.caravana_senacsa = "PY000001"
    animal.lote_actual_id = None
    animal.potrero_actual_id = None

    evento = MagicMock()
    evento.id = uuid.uuid4()
    evento.fecha_evento = hoy
    evento.fecha_registro = datetime.now(timezone.utc)
    evento.observaciones = None

    em = MagicMock()
    em.tipo_movimiento = "egreso_venta"
    em.potrero_origen_id = None
    em.potrero_destino_id = None
    em.lote_destino_id = None
    em.proveedor = None
    em.establecimiento_origen = None
    em.numero_guia_senacsa = None
    em.precio_unitario = None
    em.tipo_precio = None
    em.moneda = "PYG"
    em.comprador = None
    em.destino_venta = "frigorifico"
    em.precio_venta_unitario = None
    em.peso_venta_promedio_kg = None
    em.causa_muerte = None

    with (
        patch(
            "app.services.movimientos._check_animales_activos",
            new=AsyncMock(return_value=[animal]),
        ),
        patch(
            "app.services.movimientos._check_carencia_activa",
            new=AsyncMock(return_value=[]),
        ),
        patch.object(crud_ev, "create_evento", new=AsyncMock(return_value=evento)),
        patch.object(crud_ev, "create_eventos_animales", new=AsyncMock()),
        patch.object(crud_ev, "create_evento_movimiento", new=AsyncMock(return_value=em)),
    ):
        db = AsyncMock()
        db.commit = AsyncMock()
        result = await registrar_egreso_venta(db, est_id, data, user_id)

    assert result.tipo_movimiento == "egreso_venta"
    assert animal_id in result.animal_ids
