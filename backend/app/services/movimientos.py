"""
Servicio de movimientos de animales.

Orden de inserción para ingreso_compra y nacimiento:
  1. Crear Animal(es) con datos base
  2. Crear AnimalCategoria
  3. Crear Evento (tipo='movimiento')
  4. Crear EventoAnimal (uno por animal)
  5. Crear EventoMovimiento → dispara trg_actualizar_ubicacion que setea
     potrero_actual_id y lote_actual_id en cada animal

Para traslado, egreso_venta y egreso_muerte el orden es:
  1. Crear Evento
  2. Crear EventoAnimal
  3. Crear EventoMovimiento → triggers hacen el resto
"""

import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import eventos as crud_ev
from app.models.animales import Animal, AnimalCategoria
from app.models.eventos import EventoMovimiento
from app.schemas.movimientos import (
    CarenciaInfo,
    EgresoMuerteInput,
    EgresoVentaInput,
    IngresoCompraInput,
    MovimientoRead,
    NacimientoInput,
    TrasladoInternoInput,
)

CATEGORIAS_VALIDAS = frozenset(
    ("ternero", "ternera", "novillo", "vaquillona", "vaca", "vaca_con_cria", "toro", "buey")
)


async def _check_animales_activos(
    db: AsyncSession,
    animal_ids: list[uuid.UUID],
    establecimiento_id: uuid.UUID,
) -> list[Animal]:
    result = await db.execute(
        select(Animal).where(
            Animal.id.in_(animal_ids),
            Animal.establecimiento_id == establecimiento_id,
            Animal.estado == "activo",
        )
    )
    animales = result.scalars().all()
    found = {a.id for a in animales}
    missing = [str(aid) for aid in animal_ids if aid not in found]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Animales no encontrados o inactivos: {', '.join(missing)}",
        )
    return list(animales)


async def _check_carencia_activa(
    db: AsyncSession,
    animal_ids: list[uuid.UUID],
) -> list[CarenciaInfo]:
    if not animal_ids:
        return []
    array_literal = "{" + ",".join(str(aid) for aid in animal_ids) + "}"
    result = await db.execute(
        text(
            "SELECT animal_id, fecha_fin_carencia, medicamento "
            "FROM animales_con_carencia_activa(:ids::UUID[])"
        ),
        {"ids": array_literal},
    )
    return [
        CarenciaInfo(
            animal_id=row.animal_id,
            fecha_fin_carencia=row.fecha_fin_carencia,
            medicamento=row.medicamento,
        )
        for row in result
    ]


def _build_read(
    evento,
    em: EventoMovimiento,
    animal_ids: list[uuid.UUID],
    advertencias: list[str] | None = None,
) -> MovimientoRead:
    return MovimientoRead(
        evento_id=evento.id,
        tipo_movimiento=em.tipo_movimiento,
        fecha_evento=evento.fecha_evento,
        fecha_registro=evento.fecha_registro,
        observaciones=evento.observaciones,
        animal_ids=animal_ids,
        potrero_origen_id=em.potrero_origen_id,
        potrero_destino_id=em.potrero_destino_id,
        lote_destino_id=em.lote_destino_id,
        proveedor=em.proveedor,
        establecimiento_origen=em.establecimiento_origen,
        numero_guia_senacsa=em.numero_guia_senacsa,
        precio_unitario=em.precio_unitario,
        tipo_precio=em.tipo_precio,
        moneda=em.moneda,
        comprador=em.comprador,
        destino_venta=em.destino_venta,
        precio_venta_unitario=em.precio_venta_unitario,
        peso_venta_promedio_kg=em.peso_venta_promedio_kg,
        causa_muerte=em.causa_muerte,
        advertencias=advertencias or [],
    )


async def registrar_ingreso_compra(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: IngresoCompraInput,
    user_id: uuid.UUID,
) -> MovimientoRead:
    today = date.today()
    if data.fecha_evento > today:
        raise HTTPException(status_code=400, detail="RN-18: la fecha del evento no puede ser futura")

    for item in data.animales:
        item.validate_identificacion()
        if item.categoria not in CATEGORIAS_VALIDAS:
            raise HTTPException(status_code=400, detail=f"Categoría inválida: {item.categoria}")

    try:
        nuevos_animales: list[Animal] = []
        for item in data.animales:
            animal = Animal(
                establecimiento_id=establecimiento_id,
                caravana_senacsa=item.caravana_senacsa,
                numero_campo=item.numero_campo,
                sexo=item.sexo,
                tipo_origen="comprado",
                raza=item.raza,
                fecha_nacimiento=item.fecha_nacimiento,
                fecha_nacimiento_estimada=item.fecha_nacimiento_estimada,
                establecimiento_origen=item.establecimiento_origen_animal,
            )
            db.add(animal)
            await db.flush()

            cat = AnimalCategoria(
                animal_id=animal.id,
                categoria=item.categoria,
                fecha_inicio=data.fecha_evento,
                usuario_id=user_id,
            )
            db.add(cat)
            nuevos_animales.append(animal)

        await db.flush()

        evento = await crud_ev.create_evento(
            db, establecimiento_id, "movimiento", data.fecha_evento, user_id, data.observaciones
        )
        animal_ids = [a.id for a in nuevos_animales]
        await crud_ev.create_eventos_animales(db, evento.id, animal_ids)
        em = await crud_ev.create_evento_movimiento(
            db,
            evento.id,
            "ingreso_compra",
            potrero_destino_id=data.potrero_destino_id,
            lote_destino_id=data.lote_destino_id,
            proveedor=data.proveedor,
            establecimiento_origen=data.establecimiento_origen,
            numero_guia_senacsa=data.numero_guia_senacsa,
            precio_unitario=data.precio_unitario,
            tipo_precio=data.tipo_precio,
            moneda=data.moneda,
        )

        if data.precio_unitario and data.moneda:
            for animal in nuevos_animales:
                await crud_ev.create_evento_economico(
                    db,
                    establecimiento_id,
                    evento.id,
                    "compra_animal",
                    data.precio_unitario,
                    data.moneda,
                    animal_id=animal.id,
                    lote_id=data.lote_destino_id,
                )

        await db.commit()
        return _build_read(evento, em, animal_ids)

    except IntegrityError as exc:
        await db.rollback()
        orig = str(exc.orig).lower()
        if "uq_animales_caravana" in orig or "caravana_senacsa" in orig:
            raise HTTPException(status_code=409, detail="Caravana duplicada en alguno de los animales")
        if "uq_animales_numero_campo" in orig or "numero_campo" in orig:
            raise HTTPException(status_code=409, detail="Número de campo duplicado en alguno de los animales")
        raise HTTPException(status_code=409, detail="Identificación duplicada")


async def registrar_nacimiento(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: NacimientoInput,
    user_id: uuid.UUID,
) -> MovimientoRead:
    today = date.today()
    if data.fecha_evento > today:
        raise HTTPException(status_code=400, detail="RN-18: la fecha del evento no puede ser futura")
    if data.fecha_nacimiento > today:
        raise HTTPException(status_code=400, detail="La fecha de nacimiento no puede ser futura")

    madre = await db.get(Animal, data.madre_id)
    if not madre or madre.establecimiento_id != establecimiento_id:
        raise HTTPException(status_code=404, detail="Madre no encontrada")
    if madre.estado != "activo":
        raise HTTPException(status_code=400, detail="La madre debe estar activa")
    if madre.sexo != "hembra":
        raise HTTPException(status_code=400, detail="La madre debe ser hembra")

    if not data.caravana_senacsa and not data.numero_campo:
        raise HTTPException(status_code=400, detail="El ternero debe tener al menos caravana o número de campo")

    categoria = "ternero" if data.sexo == "macho" else "ternera"

    try:
        cria = Animal(
            establecimiento_id=establecimiento_id,
            caravana_senacsa=data.caravana_senacsa,
            numero_campo=data.numero_campo,
            sexo=data.sexo,
            tipo_origen="nacido",
            raza=data.raza or madre.raza,
            fecha_nacimiento=data.fecha_nacimiento,
            fecha_nacimiento_estimada=data.fecha_nacimiento_estimada,
            madre_id=data.madre_id,
            padre_id=data.padre_id,
        )
        db.add(cria)
        await db.flush()

        cat = AnimalCategoria(
            animal_id=cria.id,
            categoria=categoria,
            fecha_inicio=data.fecha_nacimiento,
            usuario_id=user_id,
        )
        db.add(cat)
        await db.flush()

        evento = await crud_ev.create_evento(
            db, establecimiento_id, "movimiento", data.fecha_evento, user_id, data.observaciones
        )
        await crud_ev.create_eventos_animales(db, evento.id, [cria.id])
        em = await crud_ev.create_evento_movimiento(
            db,
            evento.id,
            "nacimiento",
            potrero_destino_id=data.potrero_destino_id,
            lote_destino_id=data.lote_destino_id,
            padre_id=data.padre_id,
        )

        await db.commit()
        return _build_read(evento, em, [cria.id])

    except IntegrityError as exc:
        await db.rollback()
        orig = str(exc.orig).lower()
        if "caravana" in orig:
            raise HTTPException(status_code=409, detail="Caravana duplicada")
        if "numero_campo" in orig:
            raise HTTPException(status_code=409, detail="Número de campo duplicado")
        raise HTTPException(status_code=409, detail="Identificación duplicada en el ternero")


async def registrar_traslado(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: TrasladoInternoInput,
    user_id: uuid.UUID,
) -> MovimientoRead:
    today = date.today()
    if data.fecha_evento > today:
        raise HTTPException(status_code=400, detail="RN-18: la fecha del evento no puede ser futura")

    animales = await _check_animales_activos(db, data.animal_ids, establecimiento_id)

    advertencias: list[str] = []
    carga = await _calcular_carga_potrero(db, data.potrero_destino_id, establecimiento_id)
    if carga:
        cap_total, carga_actual, animales_ug = carga
        if cap_total and cap_total > 0:
            pct = ((carga_actual + animales_ug) / cap_total) * 100
            if pct > 110:
                advertencias.append(
                    f"El potrero destino quedaría al {pct:.0f}% de su capacidad (rojo). "
                    "Considere redistribuir los animales."
                )
            elif pct > 85:
                advertencias.append(
                    f"El potrero destino quedaría al {pct:.0f}% de su capacidad (amarillo)."
                )

    potrero_origen_id = animales[0].potrero_actual_id if animales else None

    evento = await crud_ev.create_evento(
        db, establecimiento_id, "movimiento", data.fecha_evento, user_id, data.observaciones
    )
    await crud_ev.create_eventos_animales(db, evento.id, data.animal_ids)
    em = await crud_ev.create_evento_movimiento(
        db,
        evento.id,
        "traslado_interno",
        potrero_origen_id=potrero_origen_id,
        potrero_destino_id=data.potrero_destino_id,
    )

    await db.commit()
    return _build_read(evento, em, data.animal_ids, advertencias)


async def registrar_egreso_venta(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: EgresoVentaInput,
    user_id: uuid.UUID,
) -> MovimientoRead:
    today = date.today()
    if data.fecha_evento > today:
        raise HTTPException(status_code=400, detail="RN-18: la fecha del evento no puede ser futura")

    animales = await _check_animales_activos(db, data.animal_ids, establecimiento_id)

    # RN-04: todos deben tener caravana SENACSA para egresos externos
    sin_caravana = [str(a.id) for a in animales if not a.caravana_senacsa]
    if sin_caravana:
        raise HTTPException(
            status_code=400,
            detail=(
                f"RN-04: los siguientes animales no tienen caravana SENACSA y no pueden "
                f"tener egresos externos: {', '.join(sin_caravana)}"
            ),
        )

    # RN-06/08: bloqueo hard si hay carencia activa
    con_carencia = await _check_carencia_activa(db, data.animal_ids)
    if con_carencia:
        raise HTTPException(
            status_code=400,
            detail={
                "mensaje": "RN-06: uno o más animales tienen carencia activa y no pueden venderse",
                "animales_con_carencia": [
                    {
                        "animal_id": str(c.animal_id),
                        "fecha_fin_carencia": c.fecha_fin_carencia.isoformat(),
                        "medicamento": c.medicamento,
                    }
                    for c in con_carencia
                ],
            },
        )

    potrero_origen_id = animales[0].potrero_actual_id if animales else None

    evento = await crud_ev.create_evento(
        db, establecimiento_id, "movimiento", data.fecha_evento, user_id, data.observaciones
    )
    await crud_ev.create_eventos_animales(db, evento.id, data.animal_ids)
    em = await crud_ev.create_evento_movimiento(
        db,
        evento.id,
        "egreso_venta",
        potrero_origen_id=potrero_origen_id,
        comprador=data.comprador,
        destino_venta=data.destino_venta,
        precio_venta_unitario=data.precio_venta_unitario,
        peso_venta_promedio_kg=data.peso_venta_promedio_kg,
        moneda=data.moneda,
        numero_guia_senacsa=data.numero_guia_senacsa,
    )

    if data.precio_venta_unitario and data.moneda:
        lote_id = animales[0].lote_actual_id if animales else None
        for animal in animales:
            await crud_ev.create_evento_economico(
                db,
                establecimiento_id,
                evento.id,
                "venta_animal",
                data.precio_venta_unitario,
                data.moneda,
                animal_id=animal.id,
                lote_id=lote_id,
            )

    await db.commit()
    return _build_read(evento, em, data.animal_ids)


async def registrar_egreso_muerte(
    db: AsyncSession,
    establecimiento_id: uuid.UUID,
    data: EgresoMuerteInput,
    user_id: uuid.UUID,
) -> MovimientoRead:
    today = date.today()
    if data.fecha_evento > today:
        raise HTTPException(status_code=400, detail="RN-18: la fecha del evento no puede ser futura")

    animales = await _check_animales_activos(db, [data.animal_id], establecimiento_id)
    animal = animales[0]

    evento = await crud_ev.create_evento(
        db, establecimiento_id, "movimiento", data.fecha_evento, user_id, data.observaciones
    )
    await crud_ev.create_eventos_animales(db, evento.id, [data.animal_id])
    em = await crud_ev.create_evento_movimiento(
        db,
        evento.id,
        "egreso_muerte",
        potrero_origen_id=animal.potrero_actual_id,
        causa_muerte=data.causa_muerte,
    )

    await db.commit()
    return _build_read(evento, em, [data.animal_id])


async def _calcular_carga_potrero(
    db: AsyncSession,
    potrero_id: uuid.UUID,
    establecimiento_id: uuid.UUID,
) -> tuple | None:
    """Devuelve (capacidad_total_ug, carga_actual_ug, ug_a_trasladar) o None si no aplica."""
    from app.models.potreros import Potrero
    potrero_res = await db.execute(
        select(Potrero).where(
            Potrero.id == potrero_id,
            Potrero.establecimiento_id == establecimiento_id,
        )
    )
    potrero = potrero_res.scalar_one_or_none()
    if not potrero or not potrero.superficie_ha or not potrero.capacidad_max_ug_ha:
        return None

    cap_total = potrero.superficie_ha * potrero.capacidad_max_ug_ha

    carga_res = await db.execute(
        text("""
            SELECT COALESCE(SUM(cat.coeficiente_ug), 0) AS carga_ug,
                   COUNT(a.id) AS total_animales
            FROM animales a
            JOIN animal_categorias ac ON ac.animal_id = a.id AND ac.fecha_fin IS NULL
            JOIN categorias cat ON cat.nombre = ac.categoria
                AND cat.establecimiento_id = a.establecimiento_id
            WHERE a.potrero_actual_id = :potrero_id
              AND a.estado = 'activo'
        """),
        {"potrero_id": str(potrero_id)},
    )
    row = carga_res.one()
    return cap_total, row.carga_ug, 0
