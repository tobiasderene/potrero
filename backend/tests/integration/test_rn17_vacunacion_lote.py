"""RN-17: vacunar un lote genera un EventoAnimal por cada animal activo."""
import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.sanidad import VacunacionInput


def _make_animal(aid: uuid.UUID, est_id: uuid.UUID) -> MagicMock:
    a = MagicMock()
    a.id = aid
    a.establecimiento_id = est_id
    a.estado = "activo"
    return a


def _make_evento(evento_id: uuid.UUID) -> MagicMock:
    from datetime import datetime, timezone
    ev = MagicMock()
    ev.id = evento_id
    ev.fecha_evento = date.today()
    ev.fecha_registro = datetime.now(timezone.utc)
    ev.observaciones = None
    return ev


def _make_vacunacion(evento_id: uuid.UUID) -> MagicMock:
    v = MagicMock()
    v.biologico = "Aftovaxpur DOE"
    v.laboratorio = "Boehringer"
    v.numero_lote_biologico = "LOT001"
    v.fecha_vencimiento_biol = None
    v.dosis_ml = Decimal("2.0")
    v.via_administracion = "subcutanea"
    v.es_antiaftosa = True
    v.lote_id = None
    return v


@pytest.mark.asyncio
async def test_vacunar_lote_80_animales_genera_80_eventos_animales():
    """RN-17: lote de 80 animales → 80 EventoAnimal bajo el mismo evento padre."""
    from app.services.sanidad import registrar_vacunacion
    from app.crud import eventos as crud_ev, sanidad as crud_s

    lote_id = uuid.uuid4()
    est_id = uuid.uuid4()
    user_id = uuid.uuid4()
    hoy = date.today()

    TOTAL = 80
    animal_ids = [uuid.uuid4() for _ in range(TOTAL)]
    animales = [_make_animal(aid, est_id) for aid in animal_ids]

    evento = _make_evento(uuid.uuid4())
    vacunacion = _make_vacunacion(evento.id)

    data = VacunacionInput(
        fecha_evento=hoy,
        lote_id=lote_id,
        biologico="Aftovaxpur DOE",
        laboratorio="Boehringer",
        dosis_ml=Decimal("2.0"),
        via_administracion="subcutanea",
        es_antiaftosa=True,
    )

    calls_create_ea: list = []

    async def fake_create_ea(db, ev_id, aids):
        calls_create_ea.append((ev_id, aids))

    with (
        patch.object(crud_s, "get_animales_activos_lote", new=AsyncMock(return_value=animales)),
        patch.object(crud_ev, "create_evento", new=AsyncMock(return_value=evento)),
        patch.object(crud_ev, "create_eventos_animales", new=AsyncMock(side_effect=fake_create_ea)),
        patch.object(crud_s, "create_vacunacion", new=AsyncMock(return_value=vacunacion)),
    ):
        db = AsyncMock()
        db.get = AsyncMock(return_value=None)
        db.commit = AsyncMock()

        result = await registrar_vacunacion(db, est_id, data, user_id)

    assert result.total_animales == TOTAL
    assert len(result.animal_ids) == TOTAL

    # Un llamado a create_eventos_animales por cada animal (llamados individuales)
    assert len(calls_create_ea) == TOTAL
    for call in calls_create_ea:
        ev_id, aids = call
        assert ev_id == evento.id
        assert len(aids) == 1


@pytest.mark.asyncio
async def test_vacunacion_individual_un_animal():
    """Vacunación individual: un EventoAnimal para ese animal."""
    from app.services.sanidad import registrar_vacunacion
    from app.crud import eventos as crud_ev, sanidad as crud_s

    animal_id = uuid.uuid4()
    est_id = uuid.uuid4()
    hoy = date.today()

    animal = _make_animal(animal_id, est_id)
    evento = _make_evento(uuid.uuid4())
    vacunacion = _make_vacunacion(evento.id)

    data = VacunacionInput(
        fecha_evento=hoy,
        animal_ids=[animal_id],
        biologico="Bovisan",
        es_antiaftosa=False,
    )

    calls: list = []

    async def fake_create_ea(db, ev_id, aids):
        calls.append((ev_id, aids))

    with (
        patch.object(crud_ev, "create_evento", new=AsyncMock(return_value=evento)),
        patch.object(crud_ev, "create_eventos_animales", new=AsyncMock(side_effect=fake_create_ea)),
        patch.object(crud_s, "create_vacunacion", new=AsyncMock(return_value=vacunacion)),
    ):
        db = AsyncMock()
        db.get = AsyncMock(return_value=animal)
        db.commit = AsyncMock()

        result = await registrar_vacunacion(db, est_id, data, uuid.uuid4())

    assert result.total_animales == 1
    assert len(calls) == 1
    assert calls[0][1] == [animal_id]


@pytest.mark.asyncio
async def test_vacunacion_fecha_futura_bloqueada():
    """RN-18 en vacunación."""
    from fastapi import HTTPException
    from app.services.sanidad import registrar_vacunacion
    from datetime import timedelta

    data = VacunacionInput(
        fecha_evento=date.today() + timedelta(days=1),
        animal_ids=[uuid.uuid4()],
        biologico="Vacuna X",
    )

    with pytest.raises(HTTPException) as exc:
        await registrar_vacunacion(AsyncMock(), uuid.uuid4(), data, uuid.uuid4())

    assert exc.value.status_code == 400
    assert "RN-18" in exc.value.detail


@pytest.mark.asyncio
async def test_vacunacion_requiere_animal_o_lote():
    """Debe fallar si no se especifica ni animal_ids ni lote_id."""
    from fastapi import HTTPException
    from app.services.sanidad import registrar_vacunacion

    data = VacunacionInput(
        fecha_evento=date.today(),
        biologico="Vacuna X",
    )

    with pytest.raises(HTTPException) as exc:
        await registrar_vacunacion(AsyncMock(), uuid.uuid4(), data, uuid.uuid4())

    assert exc.value.status_code == 400
