# Cierre Sprint 2 — Animales e Importación
**Período:** Semanas 5–8  
**Fecha de cierre:** 2026-07-08

---

## Objetivo

Tener el inventario de animales operativo: alta individual, importación masiva por CSV con reporte de errores por fila, búsqueda y filtros combinables, y ficha individual del animal.

---

## Entregables

| # | Entregable | Estado | Notas |
|---|---|---|---|
| 1 | Modelo SQLAlchemy `Animal` + migración Alembic | ✅ | |
| 2 | Modelo `AnimalCategoria` + constraint categoría única activa | ✅ | |
| 3 | Schemas Pydantic: `AnimalCreate`, `AnimalUpdate`, `AnimalRead` | ✅ | Validación: caravana o número de campo obligatorio |
| 4 | CRUD puro de animales | ✅ | |
| 5 | Service: alta individual (RN-01, RN-04) | ✅ | |
| 6 | Service: cambio de categoría (RN-05) | ✅ | Cierra período anterior, abre nuevo |
| 7 | Endpoints REST `/api/v1/animales` sin DELETE expuesto | ✅ | RN-01 |
| 8 | Frontend: estructura `features/animales/` | ✅ | |
| 9 | Frontend: formulario de alta individual (React Hook Form + Zod) | ✅ | |
| 10 | Frontend: tabla con TanStack Table + paginación cursor | ✅ | |
| 11 | Backend: endpoint descarga plantilla CSV | ✅ | |
| 12 | Backend: parser CSV + validación fila por fila | ✅ | |
| 13 | Backend: tabla `importaciones` + reporte de errores en JSONB | ✅ | |
| 14 | Backend: endpoint reimportación de filas corregidas | ✅ | |
| 15 | Frontend: flujo importación CSV (subir → reporte → corregir → resubir) | ✅ | |
| 16 | Frontend: errores descriptivos por fila | ✅ | Ej.: "fila 47: categoría 'NV' no reconocida" |
| 17 | Backend: filtros de búsqueda (caravana, número de campo, categoría, potrero, estado) | ✅ | |
| 18 | Frontend: barra de búsqueda y filtros combinables | ✅ | Fix: sentinel `__todos__` para evitar freeze de Radix UI con `value=""` |
| 19 | Frontend: ficha individual del animal | ✅ | Identidad, categoría actual, ubicación |
| 20 | Test integración: CSV con errores → corregir → reimportar → inventario correcto | ✅ | Verificado manualmente |
| 21 | Test: intento de borrado físico debe fallar (RN-01) | ✅ | 2 tests automatizados — ver `tests/integration/test_rn01_animal_no_borrable.py` |
| 22 | Performance: importación CSV 1000 filas en Cloud Run | ✅ | Ver sección de decisión técnica abajo |
| 23 | Docs: decisión procesamiento síncrono + umbral migración a async | ✅ | Este documento |

---

## Condición de cierre — Verificada

> "Cargar un CSV de 500 animales con datos incompletos y errores, corregir en base al reporte, reimportar, y tener el inventario completo. Buscar un animal por caravana y ver su ficha."

| Check | Resultado |
|---|---|
| CSV con errores muestra reporte fila por fila | ✅ |
| Reimportación de filas corregidas suma al inventario | ✅ |
| Búsqueda por caravana retorna el animal correcto | ✅ |
| Ficha individual muestra identidad y categoría actual | ✅ |
| Filtro por potrero, categoría y estado funcionan combinados | ✅ |
| RN-01: DELETE devuelve 405 en todos los entornos | ✅ |

---

## Decisión técnica: procesamiento síncrono de CSV (deuda aceptada)

### Contexto

El procesamiento de un CSV grande en Cloud Run con instancias pequeñas supera los 15 segundos que el plan marcaba como umbral de alerta. La prueba de carga con 1.000 filas confirmó tiempos de ~25–40 segundos en total.

### Decisión adoptada: síncrono por chunks con feedback de progreso

En lugar de migrar a procesamiento asíncrono (cola de tareas + polling), se optó por dividir el archivo en el frontend en **lotes de 200 filas** y enviarlos secuencialmente al mismo endpoint síncrono existente. El frontend muestra una barra de progreso real entre lotes.

**Ventajas:**
- Sin infraestructura adicional (sin workers, sin Redis, sin tabla de jobs)
- El usuario ve progreso real, no una pantalla en blanco
- Cada lote tarda 5–8 s, dentro del timeout de Cloud Run
- El reporte de errores se agrega y ajusta los números de fila al archivo original

**Limitaciones aceptadas:**
- El navegador debe permanecer abierto durante la importación
- No hay retry automático por lote (si falla, se detiene y muestra error)
- No escala si el archivo supera ~5.000 filas en una sesión práctica

### Umbral para migrar a procesamiento asíncrono real

Implementar cola de tareas (ej. Cloud Tasks + endpoint de polling) cuando se cumpla **alguna** de estas condiciones:

| Condición | Umbral |
|---|---|
| Tamaño habitual de CSV en producción | > 2.000 filas por importación |
| Tiempo promedio por lote en Cloud Run | > 15 segundos |
| Tasa de importaciones fallidas por timeout | > 5% en un mes |
| El negocio requiere importaciones en segundo plano (sin mantener el navegador abierto) | — |

Hasta que se alcance alguno de estos umbrales, la solución por chunks es suficiente y evita complejidad operativa innecesaria para el volumen actual de un solo establecimiento en MVP.

### Archivos relevantes

- `frontend/src/features/animales/components/ImportacionCSV.tsx` — lógica de chunking y progreso
- `backend/app/routers/v1/importaciones.py` — endpoint síncrono
- `backend/app/services/importacion_csv.py` — parser y validador

---

## Bug encontrado y resuelto en este sprint

**Filtro por potrero congelaba la pantalla de animales cuando no había potreros cargados.**

- **Causa:** Radix UI Select tiene comportamiento indefinido cuando `value=""` en un `SelectItem` coincide con el `value=""` del Select controlado. Con lista de potreros vacía, el único ítem ("Todos") usaba `value=""` igual que el estado inicial del filtro, lo que generaba un loop interno del componente.
- **Fix:** Se reemplazó `value=""` por el sentinel `"__todos__"` en los tres filtros (categoría, potrero, estado). `onValueChange` compara contra `"__todos__"` para determinar si resetear el filtro a `undefined`.
- **Commit:** `f60894c`

---

## Deuda técnica conocida

- Procesamiento asíncrono de CSV cuando se superen los umbrales documentados arriba.
- El retry por lote en importaciones grandes es manual (el usuario debe volver a subir). Automatizar en V2.
- La ficha individual del animal no muestra historial de eventos todavía (pospuesto a Sprint 3 junto con movimientos y sanidad).
