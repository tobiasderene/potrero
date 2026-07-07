from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.v1 import router as api_v1

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

app.include_router(api_v1)


@app.get("/healths", tags=["infra"])
async def health_check() -> dict:
    return {"status": "ok"}
