import csv
import io
import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.animales import Animal, AnimalCategoria
from app.models.importaciones import Importacion
from app.models.lotes import Lote
from app.models.potreros import Potrero
from app.schemas.animales import CATEGORIAS_VALIDAS

SEXOS_VALIDOS = ("macho", "hembra")
TIPOS_ORIGEN_VALIDOS = ("nacido", "comprado")

PLANTILLA_CSV = (
    "caravana_senacsa,numero_campo,categoria,sexo,raza,fecha_nacimiento,tipo_origen,potrero,lote\n"
    "AR001,101,novillo,macho,Hereford,15/06/2023,comprado,Potrero Norte,[Sprint 3]\n"
    ",102,ternera,hembra,Aberdeen Angus,,nacido,,[Sprint 3]\n"
)


def _parse_fecha(valor: str) -> date | None:
    valor = valor.strip()
    if not valor:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(valor, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"fecha '{valor}' invalida — use DD/MM/YYYY")


def _validar_fila(fila: int, row: dict) -> tuple[dict | None, list[str]]:
    errores: list[str] = []

    caravana = (row.get("caravana_senacsa") or "").strip() or None
    numero_campo = (row.get("numero_campo") or "").strip() or None
    if not caravana and not numero_campo:
        errores.append("debe tener al menos caravana_senacsa o numero_campo")

    sexo = (row.get("sexo") or "").strip().lower()
    if sexo not in SEXOS_VALIDOS:
        errores.append(f"sexo '{sexo}' no reconocido — use 'macho' o 'hembra'")

    categoria = (row.get("categoria") or "").strip().lower()
    if categoria not in CATEGORIAS_VALIDAS:
        errores.append(f"categoria '{categoria}' no reconocida — use uno de: {', '.join(CATEGORIAS_VALIDAS)}")

    tipo_origen = (row.get("tipo_origen") or "").strip().lower()
    if tipo_origen not in TIPOS_ORIGEN_VALIDOS:
        errores.append(f"tipo_origen '{tipo_origen}' no reconocido — use 'nacido' o 'comprado'")

    fecha_nacimiento = None
    try:
        fecha_nacimiento = _parse_fecha(row.get("fecha_nacimiento") or "")
    except ValueError as e:
        errores.append(str(e))

    if errores:
        return None, errores

    return {
        "caravana_senacsa": caravana,
        "numero_campo": numero_campo,
        "sexo": sexo,
        "categoria": categoria,
        "tipo_origen": tipo_origen,
        "raza": (row.get("raza") or "").strip() or None,
        "fecha_nacimiento": fecha_nacimiento,
        "potrero_nombre": (row.get("potrero") or "").strip() or None,
    }, []


async def _cargar_potrero_map(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    nombres: set[str],
) -> dict[str, uuid.UUID]:
    if not nombres:
        return {}
    result = await db.execute(
        select(Potrero.nombre, Potrero.id).where(
            Potrero.establecimiento_id == establecimiento_id,
            Potrero.nombre.in_(nombres),
        )
    )
    return {row.nombre: row.id for row in result}


async def procesar(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    user_id: uuid.UUID,
    contenido: str,
    nombre_archivo: str,
    lote_id: uuid.UUID | None = None,
) -> Importacion:
    if lote_id is not None:
        result = await db.execute(
            select(Lote).where(Lote.id == lote_id, Lote.establecimiento_id == establecimiento_id)
        )
        lote = result.scalar_one_or_none()
        if not lote:
            raise HTTPException(status_code=404, detail="Lote no encontrado")
        if lote.estado == "cerrado":
            raise HTTPException(status_code=400, detail="No se pueden importar animales a un lote cerrado")

    reader = csv.DictReader(io.StringIO(contenido))
    filas = list(reader)

    # Pre-carga de potreros para lookup
    nombres_potrero = {
        (row.get("potrero") or "").strip()
        for row in filas
        if (row.get("potrero") or "").strip()
    }
    potrero_map = await _cargar_potrero_map(db, establecimiento_id, nombres_potrero)

    exitosos = 0
    errores_report: list[dict] = []

    for i, row in enumerate(filas, start=2):
        datos_limpios, errores_val = _validar_fila(i, row)

        if errores_val:
            errores_report.append({"fila": i, "datos": dict(row), "errores": errores_val})
            continue

        potrero_id = None
        if datos_limpios["potrero_nombre"]:
            potrero_id = potrero_map.get(datos_limpios["potrero_nombre"])
            if potrero_id is None:
                errores_report.append({
                    "fila": i,
                    "datos": dict(row),
                    "errores": [f"potrero '{datos_limpios['potrero_nombre']}' no encontrado en el sistema"],
                })
                continue

        try:
            async with db.begin_nested():
                animal = Animal(
                    establecimiento_id=establecimiento_id,
                    caravana_senacsa=datos_limpios["caravana_senacsa"],
                    numero_campo=datos_limpios["numero_campo"],
                    sexo=datos_limpios["sexo"],
                    tipo_origen=datos_limpios["tipo_origen"],
                    raza=datos_limpios["raza"],
                    fecha_nacimiento=datos_limpios["fecha_nacimiento"],
                    potrero_actual_id=potrero_id,
                    lote_actual_id=lote_id,
                )
                db.add(animal)
                await db.flush()

                cat = AnimalCategoria(
                    animal_id=animal.id,
                    categoria=datos_limpios["categoria"],
                    fecha_inicio=date.today(),
                    usuario_id=user_id,
                )
                db.add(cat)
                await db.flush()

            exitosos += 1

        except IntegrityError as e:
            orig = str(e.orig).lower()
            if "uq_animales_caravana" in orig or "caravana_senacsa" in orig:
                msg = f"caravana '{datos_limpios['caravana_senacsa']}' ya existe en el sistema"
            elif "uq_animales_numero_campo" in orig or "numero_campo" in orig:
                msg = f"numero de campo '{datos_limpios['numero_campo']}' ya existe en el sistema"
            else:
                msg = "identificacion duplicada"
            errores_report.append({"fila": i, "datos": dict(row), "errores": [msg]})

    total = len(filas)
    estado = (
        "completado" if not errores_report
        else "completado_con_errores" if exitosos > 0
        else "fallido"
    )

    importacion = Importacion(
        establecimiento_id=establecimiento_id,
        usuario_id=user_id,
        nombre_archivo=nombre_archivo,
        total_filas=total,
        filas_exitosas=exitosos,
        filas_con_error=len(errores_report),
        estado=estado,
        reporte_errores=errores_report if errores_report else None,
        completado_at=datetime.now(timezone.utc),
    )
    db.add(importacion)
    await db.commit()

    return importacion
