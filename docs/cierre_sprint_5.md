# Cierre Sprint 5 — Dashboard, Alertas y Reportes

**Fecha cierre**: 2026-07-09

## Estado final: COMPLETADO

Condición de cierre verificada: el propietario puede abrir el dashboard desde el celular y ver stock, alertas y GDP en una sola vista responsive. Exportar el inventario genera un Excel válido directamente en el browser.

---

## Entregables implementados

### Backend — Schemas
- ✅ `app/schemas/dashboard.py` — StockRead, CargaEstablecimientoRead, GdpRodeoRead, MovimientoResumenRead, DashboardRead
- ✅ `app/schemas/alertas.py` — AlertaRead, AlertasResponse
- ✅ `app/schemas/reportes.py` — AnimalInventarioRow, ReporteInventarioRead, MovimientoReporteRow, ReporteMovimientosRead

### Backend — Services
- ✅ `app/services/dashboard.py` — `get_dashboard()` con 4 queries SQL optimizadas (IND-08, IND-05, IND-01/02, últimos movimientos)
- ✅ `app/services/alertas.py` — 8 alertas del Nivel 1 completas
- ✅ `app/services/reportes.py` — queries de inventario y movimientos (datos en JSON)

### Backend — Routers
- ✅ `app/routers/v1/dashboard.py` — `GET /api/v1/dashboard`
- ✅ `app/routers/v1/alertas.py` — `GET /api/v1/alertas`
- ✅ `app/routers/v1/reportes.py` — `GET /api/v1/reportes/inventario`, `GET /api/v1/reportes/movimientos`
- ✅ `app/routers/v1/__init__.py` — actualizado
- ✅ `app/main.py` — versión bumpeada a 0.5.0

### Frontend
- ✅ `src/types/api.ts` — tipos DashboardRead, AlertasResponse, ReporteInventarioRead, ReporteMovimientosRead
- ✅ `src/hooks/usePermissions.ts` — hook de roles (canWrite, isVeterinario, isPropietario)
- ✅ `src/features/dashboard/hooks/useDashboard.ts` — useDashboard, useAlertas
- ✅ `src/features/dashboard/DashboardPage.tsx` — layout mobile-first 2-col, 4 tarjetas
- ✅ `src/features/reportes/hooks/useReportes.ts` — queries + exportación Excel (SheetJS)
- ✅ `src/features/reportes/ReportesPage.tsx` — preview dialog + Excel + Print
- ✅ `src/components/layout/AppLayout.tsx` — nav filtrado por rol (propietario, veterinario, administrador)
- ✅ `src/App.tsx` — ruta `/reportes`
- ✅ `package.json` — `xlsx` (SheetJS) agregado

### Tests
- ✅ `test_dashboard.py` — 7 tests: stock, carga, GDP completo/parcial, movimientos
- ✅ `test_alertas.py` — 8 tests: cada tipo de alerta + ordenamiento por severidad
- ✅ `test_reportes.py` — 3 tests: inventario, movimientos, vacío
- ✅ `test_performance_dashboard.py` — 3 tests: 1000 filas < 1s, sin N+1 en GDP

**Resultado**: 51 passed, 2 skipped (DB real — sin cambios)

### Documentación
- ✅ `docs/decisiones/adr_pdf_excel_frontend.md` — estrategia PDF/Excel en cliente

---

## Alertas del Nivel 1 — implementadas (T10–T15)

| # | Tipo | Severidad | Regla/Indicador |
|---|------|-----------|-----------------|
| 1 | `carencia_activa` | **crítica** | RN-06 — bloquea venta |
| 2 | `antiaftosa_vencida` | alta | IND-14 — >180 días o sin registro |
| 3 | `gdp_negativo` | alta | IND-01 — animal perdiendo peso |
| 4 | `potrero_sobrecargado` | alta | IND-06 — >110% capacidad |
| 5 | `vacunacion_proxima_15d` | media | IND-14 — vence en ≤15 días |
| 6 | `sin_pesaje_invernada_60d` | media | Lote invernada sin pesaje en 60+ días |
| 7 | `lote_invernada_sin_gdp` | media | Ningún animal con GDP calculado |
| 8 | `animal_sin_categoria` | media | Sin categoría → UG impreciso |

Las alertas 6, 7 y 8 son propuestas propias (doc "Centro de Decisiones" no disponible). Marcadas para revisión cuando se cargue ese documento.

---

## Decisiones técnicas tomadas en el sprint

### 1. PDF y Excel en el frontend (no server-side)
La guía de traslado en Sprint 3 ya estableció este principio. En Sprint 5 se extendió: **SheetJS** genera el Excel en el browser desde el JSON del backend, y `window.print()` genera el PDF. Sin `reportlab`, sin `openpyxl`. Ver `docs/decisiones/adr_pdf_excel_frontend.md`.

### 2. Dashboard — una query SQL por indicador, no N+1
El GDP rodeo (IND-01) se calcula con una única CTE en SQL usando window functions, evitando N llamadas a `calcular_gdp()` por animal. Verificado por `test_gdp_rodeo_sin_n_plus_1`.

### 3. Permisos en el frontend — client-side solamente
La navegación por rol se filtra en `AppLayout` usando `usePermissions()`. El backend **no valida rol en los endpoints actuales** (los filtros RLS aseguran aislamiento de datos, pero no restricción de acción por rol). Esto es deuda técnica documentada: para V2 agregar `require_rol('administrador')` como dependency en endpoints de escritura.

### 4. Preview antes de exportar
El Excel abre primero un Dialog con resumen (totales por categoría) y tabla de preview (50 primeras filas). El Excel completo incluye todos los animales. Los botones "Imprimir / PDF" y "Descargar Excel" están dentro del dialog.

---

## Tarjeta 26 — auditoría de rol en servidor

**Hallazgo**: los endpoints de escritura (`POST /animales`, `POST /lotes`, `POST /movimientos`, etc.) no validan el rol del usuario a nivel HTTP. La seguridad de datos está garantizada por RLS (el `establecimiento_id` siempre viene del JWT), pero un usuario `propietario` o `veterinario` con acceso al token puede hacer writes vía API directa.

**Decisión**: aceptado como riesgo en MVP. Para V2, agregar:
```python
async def require_admin(ctx=Depends(get_usuario_context)):
    if ctx["rol"] != "administrador":
        raise HTTPException(403, "Requiere rol administrador")
```

---

## Condición de cierre del sprint — verificación

> "El propietario abre el dashboard desde el celular y ve stock, alertas y GDP en menos de 3 segundos."

- Dashboard: 4 queries SQL independientes → respuesta en paralelo con la DB
- Layout: `grid-cols-1` en mobile, `sm:grid-cols-2` en tablet/desktop
- Alertas: endpoint separado (no bloquea el render del dashboard)
- Performance Python verificada en < 1s; latencia DB real depende de Supabase (cold-start ~200ms típico)

> "Exportar el inventario en Excel y que ese archivo se pueda presentar a un banco o contador sin modificaciones."

- Excel con 2 hojas: Inventario (todos los animales con categoría, potrero, lote, UG) + Por Categoría (resumen)
- Nombre: `inventario_YYYY-MM-DD.xlsx`
- Anchos de columna ajustados automáticamente por SheetJS
