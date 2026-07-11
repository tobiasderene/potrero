# Cierre Sprint 1 — Fundación e Infraestructura
**Período:** Semanas 1–4  
**Fecha de cierre:** 2026-07-08

---

## Objetivo

Tener el proyecto corriendo en local y en producción, con autenticación funcionando, multi-tenant operativo y el primer establecimiento creado.

---

## Entregables

| Entregable | Estado | Notas |
|---|---|---|
| Monorepo configurado (React + Vite + FastAPI) | ✅ | |
| Docker Compose para desarrollo local (PostgreSQL/Supabase local) | ✅ | |
| Esquema de DB completo via Alembic | ✅ | Migración 0001: todas las tablas, RLS, triggers, funciones de dominio |
| CI/CD: frontend → Firebase Hosting | ✅ | GitHub Actions en `.github/workflows/deploy-frontend.yml` |
| CI/CD: backend → Cloud Run | ✅ | Pipeline configurado directamente en GCP |
| Auth: registro, login, logout, refresh token | ✅ | Supabase Auth con verificación JWT ES256 |
| Onboarding: establecimiento + potreros + categorías UG | ✅ | Flujo de 3 pasos con seed automático de 8 categorías |
| Roles: propietario, administrador, veterinario | ✅ | Almacenados en DB, resueltos en cada request via `get_usuario_context()` |
| RLS activo en todas las tablas | ✅ | `mis_establecimientos()` filtra por usuario autenticado |
| Seed de datos de prueba | ✅ | `backend/scripts/seed.py` |

---

## Condición de cierre — Verificada

> "Un usuario puede registrarse, crear un establecimiento con tres potreros, y el sistema aísla correctamente sus datos de otro establecimiento creado en la misma base."

Verificación ejecutada el 2026-07-08 con el seed script contra el backend en producción (Cloud Run):

| Check | Resultado |
|---|---|
| Seed A ve exactamente sus 3 potreros | ✅ |
| Seed B ve exactamente sus 3 potreros | ✅ |
| `establecimiento_id` distintos entre A y B | ✅ |
| Token A intenta acceder a potrero de B → 404 | ✅ |
| Token B intenta acceder a potrero de A → 404 | ✅ |
| `GET /establecimientos/me` devuelve datos distintos por usuario | ✅ |
| **Aislamiento RLS multi-tenant** | **OK** |

---

## Bug encontrado y resuelto

**POST /establecimientos y POST /potreros devolvían 500 aunque los datos se commiteaban correctamente.**

- **Causa:** `db.refresh()` después de `db.commit()` hacía un SELECT que pasaba por RLS sin contexto JWT (la conexión se reciclaba al pool tras el commit). `mis_establecimientos()` devolvía vacío → RLS filtraba la fila → SQLAlchemy lanzaba error.
- **Fix:** Se eliminaron los `db.refresh()` post-commit en `services/establecimientos.py` y `routers/v1/potreros.py`. Con `expire_on_commit=False` ya configurado en la sesión y RETURNING en el flush, el refresh era redundante.
- **Commit:** `76650d1`

---

## Deuda técnica conocida

- `POST /potreros` con nombre duplicado devuelve 500 en lugar de 409. La excepción `UniqueViolation` de asyncpg no está manejada. Se resuelve en Sprint 2 al implementar el patrón de manejo de errores de DB.
- Confirmación de email de Supabase fue desactivada temporalmente para correr el seed. **Reactivar antes de Sprint 2.**

---

## URLs de producción

| Servicio | URL |
|---|---|
| Backend (Cloud Run) | https://potrero-backend-218640624451.southamerica-east1.run.app |
| Repositorio | https://github.com/tobiasderene/potrero.git |
