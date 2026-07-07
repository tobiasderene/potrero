from fastapi import APIRouter

from app.routers.v1 import auth, categorias, establecimientos, potreros

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(establecimientos.router)
router.include_router(potreros.router)
router.include_router(categorias.router)
