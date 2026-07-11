"""
Performance: descomposición de eventos de lote con 300+ animales.

Umbral aceptado: 10 segundos en modo síncrono (sin DB real).
La migración a async queda como deuda técnica para V2.

Este test mide el tiempo de ejecución del servicio de vacunación
con un lote de 300 animales usando mocks (sin I/O real).
Si la lógica de Python pura supera 1s hay un problema de algoritmia.
El umbral de 10s aplica al tiempo total incluyendo I/O de DB real.
"""
import time
import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.sanidad import VacunacionInput


@pytest.mark.asyncio
async def test_vacunacion_300_animales_tiempo_python():
    """La lógica Python de descomposición de 300 animales debe ser < 1s."""
    from app.services.sanidad import registrar_vacunacion
    from app.crud import eventos as crud_ev, sanidad as crud_s
    from datetime import datetime, timezone

    TOTAL = 300
    lote_id = uuid.uuid4()
    est_id = uuid.uuid4()
    hoy = date.today()

    animal_ids = [uuid.uuid4() for _ in range(TOTAL)]

    animales = []
    for aid in animal_ids:
        a = MagicMock()
        a.id = aid
        a.establecimiento_id = est_id
        a.estado = "activo"
        animales.append(a)

    ev = MagicMock()
    ev.id = uuid.uuid4()
    ev.fecha_evento = hoy
    ev.fecha_registro = datetime.now(timezone.utc)
    ev.observaciones = None

    vac = MagicMock()
    vac.biologico = "Aftovaxpur DOE"
    vac.laboratorio = None
    vac.numero_lote_biologico = None
    vac.fecha_vencimiento_biol = None
    vac.dosis_ml = Decimal("2.0")
    vac.via_administracion = "subcutanea"
    vac.es_antiaftosa = True
    vac.lote_id = lote_id

    data = VacunacionInput(
        fecha_evento=hoy,
        lote_id=lote_id,
        biologico="Aftovaxpur DOE",
        dosis_ml=Decimal("2.0"),
        via_administracion="subcutanea",
        es_antiaftosa=True,
    )

    with (
        patch.object(crud_s, "get_animales_activos_lote", new=AsyncMock(return_value=animales)),
        patch.object(crud_ev, "create_evento", new=AsyncMock(return_value=ev)),
        patch.object(crud_ev, "create_eventos_animales", new=AsyncMock()),
        patch.object(crud_s, "create_vacunacion", new=AsyncMock(return_value=vac)),
    ):
        db = AsyncMock()
        db.commit = AsyncMock()

        inicio = time.perf_counter()
        result = await registrar_vacunacion(db, est_id, data, uuid.uuid4())
        elapsed = time.perf_counter() - inicio

    assert result.total_animales == TOTAL
    assert len(result.animal_ids) == TOTAL

    # Lógica Python pura no debería superar 1 segundo para 300 animales
    assert elapsed < 1.0, (
        f"La descomposición de {TOTAL} animales tardó {elapsed:.2f}s "
        f"(lógica Python pura). Umbral: 1s para Python, 10s para flujo completo con DB."
    )


@pytest.mark.asyncio
async def test_vacunacion_500_animales_tiempo_python():
    """500 animales también deben procesarse en < 1s de lógica Python."""
    from app.services.sanidad import registrar_vacunacion
    from app.crud import eventos as crud_ev, sanidad as crud_s
    from datetime import datetime, timezone

    TOTAL = 500
    lote_id = uuid.uuid4()
    est_id = uuid.uuid4()
    hoy = date.today()

    animales = []
    for _ in range(TOTAL):
        a = MagicMock()
        a.id = uuid.uuid4()
        a.establecimiento_id = est_id
        a.estado = "activo"
        animales.append(a)

    ev = MagicMock()
    ev.id = uuid.uuid4()
    ev.fecha_evento = hoy
    ev.fecha_registro = date.today()
    ev.observaciones = None

    vac = MagicMock()
    vac.biologico = "Vacuna"
    vac.laboratorio = None
    vac.numero_lote_biologico = None
    vac.fecha_vencimiento_biol = None
    vac.dosis_ml = None
    vac.via_administracion = None
    vac.es_antiaftosa = False
    vac.lote_id = lote_id

    data = VacunacionInput(
        fecha_evento=hoy,
        lote_id=lote_id,
        biologico="Vacuna",
    )

    with (
        patch.object(crud_s, "get_animales_activos_lote", new=AsyncMock(return_value=animales)),
        patch.object(crud_ev, "create_evento", new=AsyncMock(return_value=ev)),
        patch.object(crud_ev, "create_eventos_animales", new=AsyncMock()),
        patch.object(crud_s, "create_vacunacion", new=AsyncMock(return_value=vac)),
    ):
        db = AsyncMock()
        db.commit = AsyncMock()

        inicio = time.perf_counter()
        result = await registrar_vacunacion(db, est_id, data, uuid.uuid4())
        elapsed = time.perf_counter() - inicio

    assert result.total_animales == TOTAL
    assert elapsed < 1.0, f"500 animales tardó {elapsed:.2f}s"
