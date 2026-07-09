"""RN-17: evento de lote se descompone en eventos individuales por animal."""
import uuid
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.movimientos import TrasladoInternoInput


@pytest.mark.asyncio
async def test_traslado_crea_eventos_animales_individuales():
    """
    Un traslado de N animales debe crear N entradas en eventos_animales,
    una por animal (RN-17).
    """
    from unittest.mock import MagicMock
    from app.services.movimientos import registrar_traslado
    from app.crud import eventos as crud_ev

    n = 3
    animal_ids = [uuid.uuid4() for _ in range(n)]
    est_id = uuid.uuid4()
    user_id = uuid.uuid4()
    potrero_destino = uuid.uuid4()
    hoy = date.today()

    animales = []
    for aid in animal_ids:
        a = MagicMock()
        a.id = aid
        a.establecimiento_id = est_id
        a.estado = "activo"
        a.potrero_actual_id = None
        animales.append(a)

    evento = MagicMock()
    evento.id = uuid.uuid4()
    evento.fecha_evento = hoy
    evento.fecha_registro = datetime.now(timezone.utc)
    evento.observaciones = None

    em = MagicMock()
    em.tipo_movimiento = "traslado_interno"
    em.potrero_origen_id = None
    em.potrero_destino_id = potrero_destino
    em.lote_destino_id = None
    em.proveedor = None
    em.establecimiento_origen = None
    em.numero_guia_senacsa = None
    em.precio_unitario = None
    em.tipo_precio = None
    em.moneda = None
    em.comprador = None
    em.destino_venta = None
    em.precio_venta_unitario = None
    em.peso_venta_promedio_kg = None
    em.causa_muerte = None

    created_animal_ids: list[list[uuid.UUID]] = []

    async def mock_create_ea(db, evento_id, ids):
        created_animal_ids.append(list(ids))

    data = TrasladoInternoInput(
        fecha_evento=hoy,
        animal_ids=animal_ids,
        potrero_destino_id=potrero_destino,
    )

    with (
        patch(
            "app.services.movimientos._check_animales_activos",
            new=AsyncMock(return_value=animales),
        ),
        patch(
            "app.services.movimientos._calcular_carga_potrero",
            new=AsyncMock(return_value=None),
        ),
        patch.object(crud_ev, "create_evento", new=AsyncMock(return_value=evento)),
        patch.object(crud_ev, "create_eventos_animales", side_effect=mock_create_ea),
        patch.object(crud_ev, "create_evento_movimiento", new=AsyncMock(return_value=em)),
    ):
        db = AsyncMock()
        db.commit = AsyncMock()
        result = await registrar_traslado(db, est_id, data, user_id)

    # Un solo llamado a create_eventos_animales con los N animal_ids
    assert len(created_animal_ids) == 1
    assert set(created_animal_ids[0]) == set(animal_ids)
    assert len(result.animal_ids) == n
