# PMR — Sistema de Gestión Ganadera

SaaS multi-tenant para gestión de estancias bovinas en Paraguay. Trazabilidad individual de animales, gestión de lotes y potreros, pesajes con GDP automático, control sanitario y reportes para SENACSA.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + TypeScript + Vite + shadcn/ui + TanStack Query/Table |
| Backend | FastAPI + Python + Pydantic v2 + SQLAlchemy + Alembic |
| Base de datos | Supabase PostgreSQL (RLS + Auth) |
| Deploy | Firebase Hosting (frontend) + Google Cloud Run (backend) |

## Estructura

```
├── frontend/   # React SPA
├── backend/    # FastAPI REST API
├── docs/       # Documentación funcional (fuente de verdad del dominio)
└── CLAUDE.md   # Guía para Claude Code
```

## Setup local

### Requisitos
- Node.js 20+
- Python 3.12+
- Docker Desktop
- Supabase CLI

### 1. Variables de entorno
```bash
cp .env.example .env
# Completar los valores en .env
```

### 2. Base de datos local
```bash
docker-compose up -d
alembic upgrade head
```

### 3. Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
# API disponible en http://localhost:8000
# Docs en http://localhost:8000/docs
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# App disponible en http://localhost:5173
```

## Planificación (6 sprints × 4 semanas)

| Sprint | Semanas | Foco | Condición de cierre |
|--------|---------|------|---------------------|
| 1 | 1–4 | Fundación e infraestructura | Login, establecimiento creado, RLS operativo |
| 2 | 5–8 | Animales + importación CSV | 500 animales cargados en menos de una hora |
| 3 | 9–12 | Lotes, potreros y movimientos | Compra, traslado y venta con validaciones |
| 4 | 13–16 | Pesajes y sanidad | GDP calculado, carencia bloqueante operativa |
| 5 | 17–20 | Dashboard, alertas y reportes | Propietario entiende el negocio en 30 seg |
| 6 | 21–24 | Estabilización y lanzamiento | Piloto real exitoso durante dos semanas |

## Documentación funcional

Toda la lógica de dominio, reglas de negocio, esquema de base de datos e indicadores está documentada en `docs/`. Antes de implementar cualquier feature, leer el documento correspondiente.

| Documento | Contenido |
|-----------|-----------|
| `Definición del MVP.pdf` | Alcance exacto de V1 — qué entra y qué no |
| `Modelo de dominio.pdf` | Entidades, relaciones y atributos |
| `Arquitectura técnica.pdf` | Decisiones de stack e infraestructura |
| `Esquema de base de datos.pdf` | Schema PostgreSQL completo |
| `Reglas de negocio.pdf` | RN-01 a RN-25 |
| `Indicadores y fórmulas.pdf` | Fórmulas exactas con casos borde |
| `Casos de uso.pdf` | Flujos por rol de usuario |
| `Seguridad.pdf` | Controles de seguridad por capa |
| `Planificación.pdf` | Plan de 6 sprints detallado |
| `Glosario del dominio.pdf` | Vocabulario técnico del negocio ganadero |
