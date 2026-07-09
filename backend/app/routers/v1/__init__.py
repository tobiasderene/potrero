from fastapi import APIRouter

from app.routers.v1 import (
    alertas,
    animales,
    auth,
    categorias,
    dashboard,
    establecimientos,
    importaciones,
    lotes,
    movimientos,
    pesajes,
    potreros,
    reportes,
    sanidad,
)

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(establecimientos.router)
router.include_router(potreros.router)
router.include_router(categorias.router)
router.include_router(animales.router)
router.include_router(importaciones.router)
router.include_router(lotes.router)
router.include_router(movimientos.router)
router.include_router(pesajes.router)
router.include_router(sanidad.router)
router.include_router(dashboard.router)
router.include_router(alertas.router)
router.include_router(reportes.router)
