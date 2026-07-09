from fastapi import APIRouter

from app.routers.v1 import (
    animales,
    auth,
    categorias,
    establecimientos,
    importaciones,
    lotes,
    movimientos,
    pesajes,
    potreros,
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
