"""RN-01: los animales nunca se eliminan — no existe endpoint DELETE."""
import uuid

import pytest
from httpx import AsyncClient

from app.routers.v1.animales import router as animales_router


def test_router_no_expone_delete():
    """El router de animales no debe registrar ninguna ruta con método DELETE."""
    metodos_expuestos = {
        method
        for route in animales_router.routes
        for method in getattr(route, "methods", set())
    }
    assert "DELETE" not in metodos_expuestos, (
        "RN-01 violado: el router de animales expone un endpoint DELETE"
    )


@pytest.mark.asyncio
async def test_delete_animal_retorna_405(client: AsyncClient):
    """Intentar borrar un animal vía HTTP debe retornar 405 Method Not Allowed."""
    animal_id = uuid.uuid4()
    response = await client.delete(f"/api/v1/animales/{animal_id}")
    assert response.status_code == 405, (
        f"RN-01 violado: DELETE /api/v1/animales/{{id}} retornó {response.status_code} en lugar de 405"
    )
