# Deuda Técnica: Descomposición Síncrona de Eventos de Lote

**Fecha**: 2026-07-09  
**Sprint**: 4  
**Estado**: Deuda aceptada — migración a V2

## Decisión

La descomposición de eventos de lote (vacunación, pesaje) en eventos individuales se realiza de forma **síncrona** en el ciclo request-response de FastAPI.

## Umbral aceptado

**10 segundos** es el tiempo máximo aceptable para una operación síncrona de lote grande (300+ animales). Si la respuesta HTTP supera ese umbral, el frontend debe mostrar un indicador de progreso (`loading` con mensaje "Procesando X animales...") — esto ya está implementado en los formularios de vacunación y pesaje de lote.

## Medición de referencia

Tests de performance con 300 y 500 animales sobre mocks miden exclusivamente la lógica Python (sin I/O de DB). Resultado esperado: < 1s para lógica pura. El overhead de 300 INSERTs síncronos en PostgreSQL es el factor dominante en producción (~5-8s estimados).

## Por qué no se migra ahora

1. La mayoría de los lotes en producción inicial tienen < 150 animales.
2. Agregar un worker async (Celery/ARQ) requiere infraestructura adicional (Redis/RabbitMQ) que aumenta la complejidad operativa sin justificación para el MVP.
3. El riesgo está mitigado con el indicador de progreso en el frontend.

## Migración a V2

Cuando un lote supere consistentemente 200 animales o los usuarios reporten timeouts:
- Convertir `registrar_vacunacion(lote_id)` en una tarea async con ARQ o Celery.
- El endpoint `POST /sanidad/vacunaciones` retorna inmediatamente `202 Accepted` con un `job_id`.
- Un endpoint `GET /jobs/{job_id}` permite polling del estado.
- El frontend usa el estado del job para mostrar progreso real.

## Señales para activar la migración

- Timeout HTTP 504 reportado por usuarios con lotes > 200 animales.
- Tiempo de respuesta P95 > 8s en el endpoint de vacunación de lote.
