# ADR: Triggers de PostgreSQL para cierre de lote y actualización de ubicación

## Contexto

Cuando se registra un movimiento de animal (egreso o traslado), el sistema necesita:
1. Actualizar `animales.potrero_actual_id` y `animales.lote_actual_id` (desnormalización)
2. Cerrar el lote automáticamente cuando egresa el último animal activo (RN-09)

Estas actualizaciones podían implementarse en el service de Python o en la base de datos.

## Decisión

Se implementan como triggers de PostgreSQL que disparan `AFTER INSERT ON evento_movimientos`.

- `trg_actualizar_ubicacion` → llama `actualizar_ubicacion_animal()`
- `trg_cierre_lote` → llama `verificar_cierre_lote()` (solo para egresos)

## Razones

**Atomicidad garantizada por el motor.** Un movimiento que inserta en `evento_movimientos`
siempre deja los animales en estado consistente, sin importar si el servicio Python
falla, hace rollback parcial o es reemplazado en el futuro. No hay ventana donde
`evento_movimientos` exista pero `animales.lote_actual_id` no se haya actualizado.

**Única fuente de verdad para lógica crítica.** La regla RN-09 (lote se cierra cuando
egresa el último animal) involucra un conteo sobre `animales` que puede verse afectado
por operaciones concurrentes. El trigger corre dentro de la misma transacción que el
INSERT, con los locks ya adquiridos, evitando race conditions que un service Python
no puede prevenir sin SERIALIZABLE isolation.

**El service Python no puede replicar el contexto transaccional del trigger.** Si el
service actualizara la ubicación después del `flush()` de `EventoMovimiento`, y la
sesión fallara antes del `commit()`, el trigger (que no se corrió) nunca actualizaría
los animales. Con el trigger en DB, el rollback de SQLAlchemy también deshace la
actualización del trigger.

## Consecuencias

- Los tests de RN-09 (cierre de lote) y de actualización de ubicación deben correr
  contra la DB real para ser concluyentes. Los tests unitarios con mocks no pueden
  verificar que el trigger funciona correctamente.
- Las migraciones futuras que modifiquen la tabla `evento_movimientos` deben revisar
  si los triggers siguen siendo válidos.
- Depurar el comportamiento requiere acceder a los logs de PostgreSQL, no solo a los
  logs de la aplicación Python.

## Alternativa descartada

Implementar en el service Python post-`flush()`:
- Requiere leer los animales afectados y actualizarlos manualmente.
- Introduce riesgo de inconsistencia si el proceso falla entre el flush del movimiento
  y el flush de la actualización.
- No resuelve el problema de concurrencia en RN-09 sin locks explícitos.
