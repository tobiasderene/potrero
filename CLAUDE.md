# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Sistema de gestión ganadera (SaaS) para estancias bovinas de Paraguay. Regulación SENACSA. Un solo desarrollador fullstack, 6 sprints de 4 semanas. Toda la documentación de dominio, reglas de negocio y esquema de base de datos está en `docs/`.

## Monorepo structure

```
/
├── frontend/          # React + TypeScript + Vite
├── backend/           # FastAPI + Python
├── docs/              # Documentación funcional completa (fuente de verdad del dominio)
└── docker-compose.yml # Dev local: PostgreSQL (Supabase local) + backend
```

## Commands

### Frontend (`/frontend`)
```bash
npm run dev          # Dev server
npm run build        # Build para producción
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
npm test             # Vitest
npm test -- --run src/features/animales/  # Tests de un módulo
```

### Backend (`/backend`)
```bash
uvicorn app.main:app --reload          # Dev server
pytest                                  # Todos los tests
pytest tests/integration/movimientos/  # Tests de un módulo
alembic upgrade head                   # Aplicar migraciones
alembic revision --autogenerate -m ""  # Generar migración
```

### Docker local
```bash
docker-compose up -d   # Levanta PostgreSQL + Supabase local
docker-compose down
```

## Architecture

### Frontend

Stack: React 19 + TypeScript + Vite 6 + shadcn/ui + TanStack Table + TanStack Query + Recharts + React Hook Form + Zod. Vite 6 (no Vite 7/8) — Vite 8 usa rolldown que tiene bugs con rutas Windows que contienen espacios.

Features-based structure: `frontend/src/features/{animales,lotes,potreros,movimientos,sanidad,pesajes,reportes,dashboard}/`. Cada feature tiene sus propios componentes, hooks y schemas Zod. El frontend **nunca llama directamente a Supabase** para lógica de negocio — todo va por FastAPI.

### Backend

Stack: FastAPI + Python + Pydantic v2 + SQLAlchemy + Alembic.

Capas estrictas: `routers` (HTTP + permisos) → `services` (reglas de negocio) → `crud` (operaciones DB puras) → `schemas` (contratos Pydantic) → `models` (SQLAlchemy).

Estructura: `backend/app/{core,db,models,schemas,crud,services,routers}/`.

API REST versionada: `/api/v1/`. Paginación cursor para listas grandes.

### Database

Supabase PostgreSQL. RLS habilitado en **todas** las tablas de dominio desde el día uno. La función `mis_establecimientos()` filtra automáticamente cada query al establecimiento del usuario autenticado.

Convenciones del esquema: UUID v4 en todos los PKs, `timestamptz` UTC, `TEXT + CHECK` en lugar de ENUM, `NUMERIC(15,2)` para dinero (nunca FLOAT).

Todos los eventos son **inmutables**: la regla `eventos_no_update` bloquea cualquier UPDATE a nivel de motor PostgreSQL. Las correcciones crean un nuevo evento referenciando al original.

## Critical business rules

Estas reglas tienen implementación en múltiples capas — violar una en cualquier capa es un bug:

- **RN-01**: Los animales **nunca se eliminan**. No existe endpoint DELETE en animales. Las políticas RLS no incluyen DELETE.
- **RN-04**: Sin caravana SENACSA → el animal no puede tener egresos externos (egreso_venta, egreso_faena).
- **RN-06**: Carencia activa → **bloqueo hard** de venta. No es advisory. El backend retorna 400 aunque el frontend lo haya mostrado.
- **RN-07**: `fecha_fin_carencia = fecha_evento + dias_carencia`. Se calcula y persiste al guardar el tratamiento.
- **RN-08**: Si hay múltiples tratamientos activos, la carencia bloqueante es la de mayor `fecha_fin_carencia`.
- **RN-09**: El lote se cierra automáticamente (trigger) cuando egresa el último animal activo.
- **RN-15**: Eventos inmutables — corrección solo mediante nuevo evento con `es_correccion_de_id`.
- **RN-18**: No se pueden registrar eventos con fecha futura. CHECK constraint en la base además de validación en backend.

## Security constraints

- El `establecimiento_id` se extrae **siempre del JWT validado**, nunca de un parámetro del request. Ningún endpoint acepta `establecimiento_id` como input externo.
- RLS **nunca se deshabilita**, ni temporalmente para debug. Para consultas sin RLS en desarrollo: consola Supabase con rol de servicio.
- Todos los endpoints de lista tienen paginación obligatoria: default 20, máximo 100 hardcodeado en servidor.
- Los errores al cliente nunca incluyen stack traces, nombres de tablas ni queries SQL.
- Los logs nunca incluyen datos de negocio (precios, nombres de animales, etc.) — solo `user_id`, `establecimiento_id`, método HTTP, endpoint, código de respuesta.
- Secrets en variables de entorno. `.env` en `.gitignore` desde el commit inicial.

## Domain vocabulary

| Término | Significado |
|---------|-------------|
| Establecimiento | Estancia/rancho. Límite de datos en multi-tenant. |
| Potrero | Fracción del campo. Unidad de gestión forrajera (UG/ha). |
| Lote | Agrupación operativa de animales con objetivo productivo común. Unidad de análisis económico. |
| Animal | Bovino individual. Unidad mínima de trazabilidad. |
| Caravana | ID oficial SENACSA del animal (en la oreja). Requerida para egresos externos. |
| GDP | Ganancia Diaria de Peso = `(peso_actual − peso_anterior) / días × 1000` g/día. |
| UG | Unidad Ganadera. Ternero=0.30, Novillo=0.70, Vaca=1.00, Vaca_con_cria/Toro=1.20, Buey=1.00 |
| Carencia | Período post-tratamiento en que el animal no puede venderse para consumo. |
| Invernada | Ciclo de engorde. Lote propósito `invernada`. |
| Cría | Ciclo reproductivo. Lote propósito `cria`. |
| SENACSA | Autoridad sanitaria de Paraguay. Emite caravanas y autoriza guías de traslado. |
| Guía de traslado | Documento SENACSA requerido para mover animales entre establecimientos. |
| Ejercicio ganadero | Año fiscal ganadero: 1 julio → 30 junio. |

## Indicator reliability states

Every calculated indicator must be displayed with one of three states:
- `completo`: all required data is present
- `parcial`: some data missing, value is an estimate
- `sin dato suficiente`: not enough data to calculate (never show zero as substitute)

## What is NOT in the MVP

No implementar en ningún sprint: módulo reproductivo completo (servicio/preñez/parición con sus atributos), gestión financiera del ejercicio, notificaciones push/email, integración con básculas RFID, Centro de Decisiones analítico (Nivel 2 y 3), 2FA, WAF/Cloud Armor. Todo es V2.
