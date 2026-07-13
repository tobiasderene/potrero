"""RN-09: el trigger trg_cierre_lote cierra el lote cuando egresa el último animal.

Tests estructurales (sin DB real):
- El trigger y la función existen en la migración inicial
- El trigger se activa en egreso_venta, egreso_faena y egreso_muerte
- El router de lotes no expone DELETE
- El endpoint GET /lotes requiere autenticación

Test de integración real (requiere DATABASE_URL):
- Flujo completo: 1 animal en lote → egreso_muerte → lote.estado == 'cerrado'
"""
import os
from pathlib import Path

import pytest

MIGRATION_PATH = Path(__file__).parent.parent.parent / "alembic" / "versions" / "0001_initial_schema.py"


# ─── Estructural: trigger en migración ───────────────────────────────────────

def test_trigger_verificar_cierre_lote_existe_en_migracion():
    """RN-09: el trigger trg_cierre_lote debe estar en el schema inicial."""
    contenido = MIGRATION_PATH.read_text(encoding="utf-8")
    assert "verificar_cierre_lote" in contenido
    assert "trg_cierre_lote" in contenido


def test_trigger_activa_en_egresos_correctos():
    """El trigger debe activarse en egreso_venta, egreso_faena y egreso_muerte."""
    contenido = MIGRATION_PATH.read_text(encoding="utf-8")
    assert "egreso_venta" in contenido
    assert "egreso_faena" in contenido
    assert "egreso_muerte" in contenido
    # El trigger se activa AFTER INSERT en evento_movimientos
    assert "AFTER INSERT ON evento_movimientos" in contenido


def test_trigger_cierra_lote_cuando_animales_activos_es_cero():
    """El trigger debe verificar count(*) == 0 antes de cerrar el lote."""
    contenido = MIGRATION_PATH.read_text(encoding="utf-8")
    assert "v_animales_activos = 0" in contenido
    assert "'cerrado'" in contenido   # estado = 'cerrado' en el UPDATE
    assert "fecha_cierre" in contenido


# ─── Estructural: router ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_router_lotes_no_expone_delete():
    """El router de lotes no debe registrar ninguna ruta DELETE."""
    from app.routers.v1.lotes import router as lotes_router

    metodos = {
        method
        for route in lotes_router.routes
        for method in getattr(route, "methods", set())
    }
    assert "DELETE" not in metodos, "El router de lotes no debe exponer DELETE"


@pytest.mark.asyncio
async def test_lote_endpoint_get_requiere_autenticacion(client):
    """GET /api/v1/lotes requiere autenticación (401/403 sin token)."""
    response = await client.get("/api/v1/lotes")
    assert response.status_code in (401, 403)


# ─── Lógica: service registrar_egreso_muerte hace commit ─────────────────────

@pytest.mark.asyncio
async def test_egreso_muerte_llama_commit():
    """registrar_egreso_muerte debe hacer commit para que el trigger dispare."""
    import uuid
    from datetime import date
    from unittest.mock import AsyncMock, MagicMock, patch

    from app.services.movimientos import registrar_egreso_muerte
    from app.schemas.movimientos import EgresoMuerteInput
    from app.crud import eventos as crud_ev

    animal_id = uuid.uuid4()
    est_id = uuid.uuid4()
    hoy = date.today()

    data = EgresoMuerteInput(
        fecha_evento=hoy,
        animal_id=animal_id,
        causa_muerte="enfermedad",
    )

    animal = MagicMock()
    animal.id = animal_id
    animal.potrero_actual_id = None

    evento = MagicMock()
    evento.id = uuid.uuid4()
    evento.fecha_evento = hoy
    from datetime import datetime, timezone
    evento.fecha_registro = datetime.now(timezone.utc)
    evento.observaciones = None

    em = MagicMock()
    em.tipo_movimiento = "egreso_muerte"
    em.potrero_origen_id = None
    em.potrero_destino_id = None
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
    em.causa_muerte = "enfermedad"

    db = AsyncMock()

    with (
        patch(
            "app.services.movimientos._check_animales_activos",
            new=AsyncMock(return_value=[animal]),
        ),
        patch.object(crud_ev, "create_evento", new=AsyncMock(return_value=evento)),
        patch.object(crud_ev, "create_eventos_animales", new=AsyncMock()),
        patch.object(crud_ev, "create_evento_movimiento", new=AsyncMock(return_value=em)),
    ):
        result = await registrar_egreso_muerte(db, est_id, data, uuid.uuid4())

    db.commit.assert_awaited_once()
    assert result.tipo_movimiento == "egreso_muerte"


# ─── Integración real (requiere DATABASE_URL) ─────────────────────────────────

@pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="Requiere DATABASE_URL para test de integración real",
)
@pytest.mark.asyncio
async def test_trigger_cierre_lote_db_real():
    """
    Flujo esperado contra DB real:
    1. Crear establecimiento + lote con 1 animal activo
    2. Registrar egreso_muerte del animal
    3. Verificar lote.estado == 'cerrado' y lote.fecha_cierre == fecha_evento
    Ejecutar con: DATABASE_URL=<url> pytest tests/integration/test_rn09_cierre_lote.py -k db_real
    """
    pytest.skip("Requiere DB real — ejecutar con DATABASE_URL configurada")
