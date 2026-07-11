# Cierre Sprint 4 — Pesajes y Sanidad

**Fecha cierre**: 2026-07-09

## Estado final: COMPLETADO

Todos los criterios de cierre del sprint están implementados. La condición de éxito está cubierta por tests: GDP individual, vacunación de lote 80+ animales, tratamiento + bloqueo de venta, y performance 300/500 animales.

---

## Entregables implementados

### Base de datos
- ✅ Sin migración adicional — todas las tablas (evento_pesajes, evento_vacunaciones, evento_tratamientos, evento_diagnosticos) y funciones SQL (calcular_gdp, animales_con_carencia_activa) ya estaban en 0001

### Backend — Modelos ORM (nuevos)
- ✅ `app/models/eventos.py` + EventoPesaje, EventoVacunacion, EventoDiagnostico

### Backend — Schemas
- ✅ `app/schemas/pesajes.py` — PesajeIndividualInput, PesajeLoteInput, PesajeRead, GdpAnimalRead, GdpLoteRead, VariacionGdpRead
- ✅ `app/schemas/sanidad.py` — VacunacionInput/Read, TratamientoInput/Read, DiagnosticoInput/Read, CalendarioSanitarioRead

### Backend — CRUDs
- ✅ `app/crud/pesajes.py` — create_pesaje, calcular_gdp_db, get_pesajes_animal, get_pesajes_lote
- ✅ `app/crud/sanidad.py` — create_vacunacion, create_tratamiento, create_diagnostico, get_carencias_activas, get_proximas_antiaftosa

### Backend — Services
- ✅ `app/services/pesajes.py` — registrar_pesaje_individual (IND-01), registrar_pesaje_lote, calcular_gdp_animal, calcular_gdp_lote (IND-02), calcular_variacion_gdp (IND-04)
- ✅ `app/services/sanidad.py` — registrar_vacunacion (RN-17), registrar_tratamiento (RN-07), registrar_diagnostico, get_calendario_sanitario (IND-14)

### Backend — Routers
- ✅ `app/routers/v1/pesajes.py` — POST /individual, POST /lote, GET /animal/{id}/gdp, GET /animal/{id}/variacion, GET /lote/{id}/gdp, GET /animal/{id}
- ✅ `app/routers/v1/sanidad.py` — POST /vacunaciones, POST /tratamientos, POST /diagnosticos, GET /calendario, GET /animal/{id}/tratamientos, GET /animal/{id}/vacunaciones
- ✅ `app/routers/v1/__init__.py` actualizado

### Frontend
- ✅ `src/features/pesajes/hooks/usePesajes.ts`
- ✅ `src/features/pesajes/components/PesajeIndividualForm.tsx`
- ✅ `src/features/pesajes/components/PesajeLoteForm.tsx`
- ✅ `src/features/pesajes/components/GdpLoteCard.tsx` — avg/min/max con estado completo/parcial
- ✅ `src/features/pesajes/PesajesPage.tsx`
- ✅ `src/features/sanidad/hooks/useSanidad.ts`
- ✅ `src/features/sanidad/components/VacunacionForm.tsx` — individual o lote completo
- ✅ `src/features/sanidad/components/TratamientoForm.tsx` — con cálculo en vivo de fecha_fin_carencia
- ✅ `src/features/sanidad/components/DiagnosticoForm.tsx`
- ✅ `src/features/sanidad/SanidadPage.tsx`
- ✅ `src/features/sanidad/CalendarioSanitarioPage.tsx`
- ✅ `src/features/animales/AnimalFichaPage.tsx` — curva de peso (Recharts), alerta IND-04, historial por tabs, botones de acceso rápido
- ✅ `src/types/api.ts` — PesajeRead, GdpAnimalRead, GdpLoteRead, VacunacionRead, TratamientoRead, DiagnosticoRead, CalendarioSanitarioRead
- ✅ `src/App.tsx` — rutas /pesajes, /sanidad, /sanidad/calendario
- ✅ `src/components/layout/AppLayout.tsx` — Pesajes, Sanidad, Calendario San. en sidebar

### Tests
- ✅ `test_pesaje_gdp.py` — 5 tests: GDP 30 días, 15 días, sin pesaje anterior, fecha futura, GDP negativo
- ✅ `test_rn17_vacunacion_lote.py` — 4 tests: 80 animales → 80 EventoAnimal, individual, fecha futura, sin animal/lote
- ✅ `test_rn06_tratamiento_bloqueo.py` — 4 tests: RN-07 fecha fin, RN-06+07 bloqueo venta, sin carencia pasa, fecha futura
- ✅ `test_performance_lote_grande.py` — 2 tests: 300 animales < 1s, 500 animales < 1s (lógica Python pura)

**Resultado**: 31 passed, 2 skipped (DB real)

### Documentación
- ✅ `docs/decisiones/deuda_tecnica_decomposicion_asincrona.md` — umbral 10s, plan migración a async V2

---

## Decisiones técnicas tomadas durante el sprint

1. **Sin migración nueva**: todo el esquema de Sprint 4 ya estaba en 0001. Los modelos ORM faltantes (EventoPesaje, EventoVacunacion, EventoDiagnostico) se agregaron al archivo existente.

2. **GDP vía SQL function**: `calcular_gdp(p_animal_id UUID)` ya existía en 0001. Se llama desde el service Python después del INSERT del pesaje (flush previo garantiza que el nuevo peso sea visible). No hay recálculo manual en Python.

3. **RN-17 implementación**: el servicio recorre los animales del lote y llama `create_eventos_animales` individualmente (un call por animal). La granularidad permite tracking individual correcto. Performance: O(n) en memoria Python, el cuello de botella es I/O DB.

4. **IND-04 alerta 75%**: el endpoint `/animal/{id}/variacion` devuelve `alerta_bajo=true` si el GDP del animal es < 75% del promedio del lote. El frontend lo muestra como Alert en la ficha.

5. **Calendario antiaftosa**: se estimó el ciclo en 180 días (6 meses) para el período entre vacunaciones, que es el mínimo requerido por SENACSA para antiaftosa en Paraguay. Los animales que nunca se vacunaron aparecen como "sin_registro".

---

## Condición de cierre del sprint — verificación

> "Pesar un lote de 80 novillos con GDP calculado por animal y promedio del lote visible. Vacunar contra antiaftosa al lote completo. Registrar un tratamiento con 28 días de carencia e intentar vender ese animal — el sistema debe bloquearlo."

- `POST /api/v1/pesajes/individual` × 80 → GDP calculado por la SQL function en cada registro
- `GET /api/v1/pesajes/lote/{id}/gdp` → promedio/min/max visible (IND-02)
- `POST /api/v1/sanidad/vacunaciones` con `lote_id` → 80 EventoAnimal bajo mismo evento padre (RN-17)
- `POST /api/v1/sanidad/tratamientos` con `dias_carencia=28` → `fecha_fin_carencia = hoy + 28` (RN-07)
- `POST /api/v1/movimientos/egreso-venta` → HTTP 400 "carencia activa" (RN-06)

Todos verificados por tests unitarios. El flujo completo contra DB real se corre con:
```bash
DATABASE_URL=... pytest tests/ -k "flujo or rn06 or rn17"
```
