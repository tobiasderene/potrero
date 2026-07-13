"""
Tests de importación CSV — Sprint 6, tarea 4.

Cubre el flujo completo del service importacion_csv.procesar():
- Validación de cada campo (_validar_fila)
- CSV válido → completado
- CSV con solo errores → fallido
- CSV mixto → completado_con_errores
- Potrero inexistente → error de fila
- Caravana duplicada (IntegrityError) → reportado sin lanzar
- Lote cerrado → 400 inmediato
- Reimportación: misma caravana detectada como duplicada
"""
import uuid
from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.exc import IntegrityError

from app.services.importacion_csv import _validar_fila, procesar


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_db(*, flush_error: Exception | None = None) -> AsyncMock:
    """DB mockeada que soporta begin_nested como async context manager."""
    db = AsyncMock()

    ctx = AsyncMock()
    ctx.__aenter__ = AsyncMock(return_value=None)
    ctx.__aexit__ = AsyncMock(return_value=False)
    db.begin_nested = MagicMock(return_value=ctx)

    if flush_error:
        db.flush = AsyncMock(side_effect=flush_error)

    mock_result = MagicMock()
    mock_result.__iter__ = MagicMock(return_value=iter([]))
    db.execute = AsyncMock(return_value=mock_result)

    return db


CSV_VALIDO = (
    "caravana_senacsa,numero_campo,categoria,sexo,raza,fecha_nacimiento,tipo_origen,potrero,lote\n"
    "PY001,101,novillo,macho,Hereford,15/06/2023,comprado,,\n"
)

CSV_CON_ERROR = (
    "caravana_senacsa,numero_campo,categoria,sexo,raza,fecha_nacimiento,tipo_origen,potrero,lote\n"
    ",,novillo,invalido,,,nacido,,\n"
)

CSV_MIXTO = (
    "caravana_senacsa,numero_campo,categoria,sexo,raza,fecha_nacimiento,tipo_origen,potrero,lote\n"
    "PY001,101,novillo,macho,,15/06/2023,comprado,,\n"
    ",,novillo,invalido,,,nacido,,\n"
)

CSV_DOS_VALIDOS = (
    "caravana_senacsa,numero_campo,categoria,sexo,raza,fecha_nacimiento,tipo_origen,potrero,lote\n"
    "PY001,101,novillo,macho,,15/06/2023,comprado,,\n"
    "PY002,102,ternera,hembra,,10/01/2024,nacido,,\n"
)


# ─── Tests de _validar_fila (función pura, sin DB) ───────────────────────────

class TestValidarFila:
    def test_fila_valida_completa(self):
        row = {
            "caravana_senacsa": "PY001", "numero_campo": "101",
            "sexo": "macho", "categoria": "novillo",
            "tipo_origen": "comprado", "fecha_nacimiento": "15/06/2023",
            "raza": "Hereford", "potrero": "Norte",
        }
        datos, errores = _validar_fila(2, row)
        assert not errores
        assert datos["caravana_senacsa"] == "PY001"
        assert datos["fecha_nacimiento"] == date(2023, 6, 15)

    def test_fila_sin_ninguna_identificacion(self):
        row = {
            "caravana_senacsa": "", "numero_campo": "",
            "sexo": "macho", "categoria": "novillo",
            "tipo_origen": "nacido", "fecha_nacimiento": "",
        }
        _, errores = _validar_fila(2, row)
        assert errores

    def test_solo_numero_campo_es_valido(self):
        """numero_campo sin caravana es suficiente identificación."""
        row = {
            "caravana_senacsa": "", "numero_campo": "101",
            "sexo": "hembra", "categoria": "vaca",
            "tipo_origen": "nacido", "fecha_nacimiento": "",
        }
        datos, errores = _validar_fila(2, row)
        assert not errores
        assert datos["caravana_senacsa"] is None
        assert datos["numero_campo"] == "101"

    def test_sexo_invalido(self):
        row = {
            "caravana_senacsa": "PY001", "numero_campo": "",
            "sexo": "indefinido", "categoria": "novillo",
            "tipo_origen": "nacido", "fecha_nacimiento": "",
        }
        _, errores = _validar_fila(2, row)
        assert any("sexo" in e for e in errores)

    def test_categoria_invalida(self):
        row = {
            "caravana_senacsa": "PY001", "numero_campo": "",
            "sexo": "macho", "categoria": "caballo",
            "tipo_origen": "nacido", "fecha_nacimiento": "",
        }
        _, errores = _validar_fila(2, row)
        assert any("categoria" in e for e in errores)

    def test_tipo_origen_invalido(self):
        row = {
            "caravana_senacsa": "PY001", "numero_campo": "",
            "sexo": "macho", "categoria": "novillo",
            "tipo_origen": "robado", "fecha_nacimiento": "",
        }
        _, errores = _validar_fila(2, row)
        assert any("tipo_origen" in e for e in errores)

    def test_fecha_formato_invalido(self):
        row = {
            "caravana_senacsa": "PY001", "numero_campo": "",
            "sexo": "macho", "categoria": "novillo",
            "tipo_origen": "nacido", "fecha_nacimiento": "2023/13/45",
        }
        _, errores = _validar_fila(2, row)
        assert any("fecha" in e for e in errores)

    def test_fecha_formato_iso_aceptado(self):
        """Acepta YYYY-MM-DD además de DD/MM/YYYY."""
        row = {
            "caravana_senacsa": "PY001", "numero_campo": "",
            "sexo": "macho", "categoria": "novillo",
            "tipo_origen": "nacido", "fecha_nacimiento": "2023-06-15",
        }
        datos, errores = _validar_fila(2, row)
        assert not errores
        assert datos["fecha_nacimiento"] == date(2023, 6, 15)

    def test_multiples_errores_en_una_fila(self):
        """Todos los errores de una fila se reportan juntos."""
        row = {
            "caravana_senacsa": "", "numero_campo": "",
            "sexo": "invalido", "categoria": "invalido",
            "tipo_origen": "invalido", "fecha_nacimiento": "",
        }
        _, errores = _validar_fila(2, row)
        assert len(errores) >= 4  # sin id + sexo + categoria + tipo_origen


# ─── Tests de procesar (service completo con DB mockeada) ────────────────────

@pytest.mark.asyncio
async def test_procesar_csv_valido():
    """CSV válido → estado completado, contadores correctos."""
    db = _make_db()
    result = await procesar(db, uuid.uuid4(), uuid.uuid4(), CSV_VALIDO, "test.csv")
    assert result.estado == "completado"
    assert result.filas_exitosas == 1
    assert result.filas_con_error == 0
    assert result.reporte_errores is None
    assert result.total_filas == 1


@pytest.mark.asyncio
async def test_procesar_csv_solo_errores():
    """CSV completamente inválido → estado fallido."""
    db = _make_db()
    result = await procesar(db, uuid.uuid4(), uuid.uuid4(), CSV_CON_ERROR, "test.csv")
    assert result.estado == "fallido"
    assert result.filas_exitosas == 0
    assert result.filas_con_error == 1
    assert result.reporte_errores is not None
    assert result.reporte_errores[0]["fila"] == 2


@pytest.mark.asyncio
async def test_procesar_csv_mixto():
    """CSV con 1 válido y 1 inválido → completado_con_errores."""
    db = _make_db()
    result = await procesar(db, uuid.uuid4(), uuid.uuid4(), CSV_MIXTO, "test.csv")
    assert result.estado == "completado_con_errores"
    assert result.filas_exitosas == 1
    assert result.filas_con_error == 1
    assert result.total_filas == 2


@pytest.mark.asyncio
async def test_procesar_potrero_inexistente():
    """Potrero referenciado que no existe en DB → error reportado en esa fila."""
    csv = (
        "caravana_senacsa,numero_campo,categoria,sexo,raza,fecha_nacimiento,tipo_origen,potrero,lote\n"
        "PY001,101,novillo,macho,,15/06/2023,comprado,PotreAusente,\n"
    )
    db = _make_db()  # execute devuelve vacío → potrero_map vacío
    result = await procesar(db, uuid.uuid4(), uuid.uuid4(), csv, "test.csv")
    assert result.estado == "fallido"
    assert result.filas_con_error == 1
    assert any(
        "potrero" in str(e["errores"]).lower()
        for e in result.reporte_errores
    )


@pytest.mark.asyncio
async def test_procesar_caravana_duplicada():
    """IntegrityError de caravana duplicada → error reportado, no propagado."""
    orig = Exception("uq_animales_caravana violation")
    db = _make_db(flush_error=IntegrityError("stmt", {}, orig))

    result = await procesar(db, uuid.uuid4(), uuid.uuid4(), CSV_VALIDO, "test.csv")
    assert result.filas_con_error == 1
    assert result.filas_exitosas == 0
    assert result.reporte_errores is not None
    assert any(
        "caravana" in str(e["errores"]).lower()
        for e in result.reporte_errores
    )


@pytest.mark.asyncio
async def test_procesar_numero_campo_duplicado():
    """IntegrityError de numero_campo duplicado → error reportado correctamente."""
    orig = Exception("uq_animales_numero_campo violation")
    db = _make_db(flush_error=IntegrityError("stmt", {}, orig))

    csv = (
        "caravana_senacsa,numero_campo,categoria,sexo,raza,fecha_nacimiento,tipo_origen,potrero,lote\n"
        ",101,novillo,macho,,15/06/2023,comprado,,\n"
    )
    result = await procesar(db, uuid.uuid4(), uuid.uuid4(), csv, "test.csv")
    assert result.filas_con_error == 1
    assert any(
        "numero de campo" in str(e["errores"]).lower()
        for e in result.reporte_errores
    )


@pytest.mark.asyncio
async def test_procesar_lote_cerrado_rechaza():
    """Importar a lote cerrado → 400 inmediato."""
    from fastapi import HTTPException

    lote_cerrado = MagicMock()
    lote_cerrado.estado = "cerrado"

    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none = MagicMock(return_value=lote_cerrado)
    db.execute = AsyncMock(return_value=mock_result)

    with pytest.raises(HTTPException) as exc:
        await procesar(db, uuid.uuid4(), uuid.uuid4(), CSV_VALIDO, "test.csv", lote_id=uuid.uuid4())

    assert exc.value.status_code == 400
    assert "cerrado" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_procesar_lote_no_encontrado():
    """Lote_id inexistente → 404."""
    from fastapi import HTTPException

    db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none = MagicMock(return_value=None)
    db.execute = AsyncMock(return_value=mock_result)

    with pytest.raises(HTTPException) as exc:
        await procesar(db, uuid.uuid4(), uuid.uuid4(), CSV_VALIDO, "test.csv", lote_id=uuid.uuid4())

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_procesar_reporte_errores_incluye_datos_originales():
    """El reporte incluye los datos de cada fila para que el usuario pueda corregirlos."""
    db = _make_db()
    result = await procesar(db, uuid.uuid4(), uuid.uuid4(), CSV_CON_ERROR, "test.csv")

    error_entry = result.reporte_errores[0]
    assert "fila" in error_entry
    assert "errores" in error_entry
    assert "datos" in error_entry
    assert len(error_entry["errores"]) > 0


@pytest.mark.asyncio
async def test_procesar_nombre_archivo_se_almacena():
    """El nombre del archivo queda registrado en el objeto Importacion."""
    db = _make_db()
    result = await procesar(db, uuid.uuid4(), uuid.uuid4(), CSV_VALIDO, "inventario_julio.csv")
    assert result.nombre_archivo == "inventario_julio.csv"


@pytest.mark.asyncio
async def test_procesar_dos_validos_contabiliza_correctamente():
    """Múltiples filas válidas → todos los contadores correctos."""
    db = _make_db()
    result = await procesar(db, uuid.uuid4(), uuid.uuid4(), CSV_DOS_VALIDOS, "test.csv")
    assert result.estado == "completado"
    assert result.total_filas == 2
    assert result.filas_exitosas == 2
    assert result.filas_con_error == 0
