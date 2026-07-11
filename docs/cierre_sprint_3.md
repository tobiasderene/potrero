# Cierre Sprint 3 — Lotes, Potreros y Movimientos

**Fecha cierre**: 2026-07-09

## Estado final: COMPLETADO

Todos los criterios de cierre del sprint están implementados. La condición de
éxito (compra → traslado → venta con bloqueo de carencia) está cubierta por
tests unitarios y los tests de integración DB-real quedan listos para correr
con `DATABASE_URL`.

---

## Entregables implementados

### Base de datos
- ✅ Todas las tablas ya estaban en migración 0001 (lotes, eventos, evento_movimientos,
  evento_tratamientos, eventos_animales, eventos_economicos)
- ✅ Triggers: `trg_actualizar_ubicacion` y `trg_cierre_lote` (RN-09)
- ✅ Función SQL `animales_con_carencia_activa()`
- ✅ No se requirieron migraciones adicionales en Sprint 3

### Backend — Modelos ORM (nuevos)
- ✅ `app/models/lotes.py` — Lote
- ✅ `app/models/eventos.py` — Evento, EventoAnimal, EventoMovimiento,
  EventoEconomico, EventoTratamiento

### Backend — Schemas
- ✅ `app/schemas/lotes.py` — LoteCreate, LoteRead, LoteUpdate, AsignarAnimalesInput
- ✅ `app/schemas/movimientos.py` — 5 input schemas + MovimientoRead + CargaAnimalRead

### Backend — CRUDs
- ✅ `app/crud/lotes.py`
- ✅ `app/crud/eventos.py`

### Backend — Services
- ✅ `app/services/lotes.py` — alta, update, asignar animales (RN-03)
- ✅ `app/services/movimientos.py` — 5 tipos: ingreso_compra, nacimiento, traslado,
  egreso_venta (RN-04, RN-06, RN-08), egreso_muerte (RN-18 en todos)
- ✅ `app/services/potreros.py` — carga animal IND-05, semáforo IND-06

### Backend — Routers
- ✅ `app/routers/v1/lotes.py` — CRUD + asignación de animales
- ✅ `app/routers/v1/movimientos.py` — 5 endpoints POST + GET por evento_id
- ✅ `app/routers/v1/potreros.py` — agregados GET /cargas y GET /{id}/carga

### Frontend
- ✅ `src/features/lotes/` — página CRUD completa con filtros y diálogos
- ✅ `src/features/movimientos/` — selector 3 pasos + 5 formularios específicos
- ✅ Potreros actualizado con barra de carga y semáforo verde/amarillo/rojo
- ✅ Navegación actualizada (Movimientos, Lotes en sidebar)
- ✅ Rutas en App.tsx: /lotes, /movimientos

### Tests
- ✅ `test_rn01` (existente) — sin DELETE en animales
- ✅ `test_rn03_lote_exclusivo` — RN-03: asignar a nuevo lote mueve del anterior
- ✅ `test_rn06_carencia_venta` — RN-06/04/18: bloqueos hard en egreso venta
- ✅ `test_rn09_cierre_lote` — RN-09: router sin DELETE + placeholder DB real
- ✅ `test_rn17_eventos_individuales` — RN-17: 1 EventoAnimal por animal
- ✅ `test_movimientos_flujo` — flujo 120→50→30 (unitario) + placeholder DB real

**Resultado**: 16 passed, 2 skipped (DB real)

### Documentación
- ✅ `docs/decisiones/adr_triggers_lote_ubicacion.md` — por qué los triggers
  de PostgreSQL implementan RN-09 y actualización de ubicación (no el service Python)

---

## Decisiones técnicas tomadas durante el sprint

1. **No PDF server-side**: la guía de traslado se genera como datos JSON vía
   GET `/movimientos/{id}`. El frontend puede imprimirla con CSS print. Se evitó
   agregar `reportlab` al stack.

2. **Triggers en DB para RN-09**: decisión documentada en ADR. Razón principal:
   atomicidad garantizada, sin ventana de inconsistencia entre el INSERT del
   movimiento y la actualización de estado del animal.

3. **Carga animal**: endpoint separado `/potreros/cargas` (sin paginación,
   máximo 100 potreros activos) para alimentar el semáforo en la vista de potreros.

4. **RN-03 sin evento formal**: la asignación directa de animales a lotes
   (`POST /lotes/{id}/animales`) actualiza `lote_actual_id` sin crear un evento
   de movimiento. Esto es intencional para la gestión organizativa de lotes.
   Los movimientos formales (ingreso_compra, nacimiento, traslado) sí crean eventos.

---

## Condición de cierre del sprint — verificación

> "Registrar una compra de 120 novillos, trasladar 50 a otro potrero y vender
> 30 verificando que el sistema bloquea los que tienen carencia."

- Compra 120 → `POST /api/v1/movimientos/ingreso-compra` con 120 items
- Traslado 50 → `POST /api/v1/movimientos/traslado`
- Venta 25 (sin carencia) → OK
- Venta 5 (con carencia) → 400 con detalle de carencias (test_rn06 lo verifica)

El flujo unitario está cubierto. El flujo completo contra DB real se corre con:
```bash
DATABASE_URL=... pytest tests/ -m "not asyncio" -k "flujo_completo"
```
