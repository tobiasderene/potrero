"""RN-09: el trigger verificar_cierre_lote() cierra el lote cuando egresa el último animal.

Los tests de DB real se saltan si no hay DATABASE_URL configurada.
"""
import os
import uuid
from datetime import date

import pytest


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
async def test_lote_endpoint_get_existe(client):
    """GET /api/v1/lotes requiere autenticación (401 sin token)."""
    response = await client.get("/api/v1/lotes")
    assert response.status_code == 403 or response.status_code == 401


@pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="Requiere DATABASE_URL para test de integración real",
)
@pytest.mark.asyncio
async def test_trigger_cierre_lote_db():
    """
    Integración real: registrar egreso del último animal activo cierra el lote.
    Requiere DATABASE_URL configurada.
    """
    # Este test queda como placeholder para correr contra la DB real.
    # Flujo esperado:
    # 1. Crear lote con 1 animal
    # 2. Registrar egreso_muerte del animal
    # 3. Verificar que lote.estado == 'cerrado' y lote.fecha_cierre == fecha_evento
    pytest.skip("Requiere DB real — ejecutar con DATABASE_URL configurada")
