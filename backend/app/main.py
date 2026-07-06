from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(
    title="Novillo — Sistema de Gestión Ganadera",
    version="0.1.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Los routers de cada módulo se registran aquí a medida que se implementan:
# from app.routers.v1 import animales, lotes, movimientos, ...
# app.include_router(animales.router, prefix="/api/v1/animales", tags=["animales"])


@app.get("/health", tags=["infra"])
async def health_check() -> dict:
    return {"status": "ok"}
