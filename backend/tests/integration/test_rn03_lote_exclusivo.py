"""RN-03: un animal, un lote activo — asignar al nuevo lote lo mueve del anterior."""
import uuid
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.animales import Animal
from app.models.lotes import Lote


def make_animal(lote_id: uuid.UUID | None = None):
    from unittest.mock import MagicMock
    a = MagicMock(spec=Animal)
    a.id = uuid.uuid4()
    a.establecimiento_id = uuid.uuid4()
    a.estado = "activo"
    a.lote_actual_id = lote_id
    a.updated_at = datetime.now(timezone.utc)
    return a


def make_lote(estado: str = "activo"):
    from unittest.mock import MagicMock
    l = MagicMock(spec=Lote)
    l.id = uuid.uuid4()
    l.establecimiento_id = uuid.uuid4()
    l.estado = estado
    return l


@pytest.mark.asyncio
async def test_asignar_mueve_de_lote_anterior():
    """Asignar animal a lote B mientras está en lote A actualiza lote_actual_id."""
    from app.services.lotes import asignar_animales

    lote_a_id = uuid.uuid4()
    lote_b = make_lote()

    animal = make_animal(lote_id=lote_a_id)
    est_id = lote_b.establecimiento_id
    animal.establecimiento_id = est_id

    db = AsyncMock()

    # get_by_id retorna lote_b
    from app.crud import lotes as crud_lotes
    with (
        patch.object(crud_lotes, "get_by_id", new=AsyncMock(return_value=lote_b)),
        patch(
            "sqlalchemy.ext.asyncio.AsyncSession.execute",
            new=AsyncMock(),
        ),
    ):
        # Mock select() para devolver el animal
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [animal]
        db.execute = AsyncMock(return_value=mock_result)
        db.commit = AsyncMock()

        with patch.object(crud_lotes, "get_by_id", new=AsyncMock(return_value=lote_b)):
            assigned = await asignar_animales(db, lote_b.id, est_id, [animal.id])

    # El animal debe tener el nuevo lote
    assert animal.lote_actual_id == lote_b.id
    assert len(assigned) == 1


@pytest.mark.asyncio
async def test_asignar_a_lote_cerrado_falla():
    """Intentar asignar animales a un lote cerrado debe lanzar HTTPException 400."""
    from fastapi import HTTPException
    from app.services.lotes import asignar_animales
    from app.crud import lotes as crud_lotes

    lote_cerrado = make_lote(estado="cerrado")
    db = AsyncMock()

    with patch.object(crud_lotes, "get_by_id", new=AsyncMock(return_value=lote_cerrado)):
        with pytest.raises(HTTPException) as exc:
            await asignar_animales(db, lote_cerrado.id, lote_cerrado.establecimiento_id, [uuid.uuid4()])

    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_asignar_a_lote_inexistente_falla():
    """Lote no encontrado debe retornar 404."""
    from fastapi import HTTPException
    from app.services.lotes import asignar_animales
    from app.crud import lotes as crud_lotes

    db = AsyncMock()

    with patch.object(crud_lotes, "get_by_id", new=AsyncMock(return_value=None)):
        with pytest.raises(HTTPException) as exc:
            await asignar_animales(db, uuid.uuid4(), uuid.uuid4(), [uuid.uuid4()])

    assert exc.value.status_code == 404
