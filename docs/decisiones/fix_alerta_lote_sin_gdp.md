# Fix: alerta `lote_invernada_sin_gdp` ignoraba el GDP estimado de lote

**Fecha**: 2026-07-13
**Sprint**: 6
**Archivo**: `backend/app/services/alertas.py` — `_alerta_lote_invernada_sin_gdp`

## Problema

La alerta se disparaba para cualquier lote de invernada sin **pesajes individuales**
(`tipo = 'individual'`, ≥2 por animal), sin considerar que el sistema ya calcula un
GDP estimado de lote a partir de pesajes de tropa (`tipo = 'lote_estimado'`) — ver
`calcular_gdp_lote()` en `backend/app/services/pesajes.py` y `calcular_gdp_lote_estimado()`
en `backend/app/crud/pesajes.py`, que el dashboard y `GdpLoteCard.tsx` ya consumen y
muestran con estado `parcial`.

Resultado: un lote con GDP `parcial` calculado y visible en el dashboard igual
generaba la alerta "ningún animal tiene GDP calculado", una alerta contradictoria
con lo que el propio sistema mostraba.

## Fix

`_alerta_lote_invernada_sin_gdp` ahora replica el mismo criterio de fallback que
`calcular_gdp_lote()`: solo dispara si el lote **no tiene GDP calculable por
ninguna vía** — ni ≥2 pesajes individuales de algún animal activo, ni ≥2 pesajes
`lote_estimado` del lote. Esto alinea la alerta con los tres estados de
confiabilidad del indicador (`completo` / `parcial` / `sin dato suficiente`):
la alerta ahora corresponde exactamente al caso `sin dato suficiente`.

Mensaje actualizado para reflejar ambas vías: "Se necesitan al menos 2 pesajes
individuales o 2 pesajes de lote."

## Pendiente

No se agregó test de integración para el caso (lote con solo pesajes
`lote_estimado` que ya no debe disparar la alerta) — queda como deuda de
cobertura si se retoma este módulo.
