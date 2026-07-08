import logging
import traceback

from fastapi import APIRouter

from app.routers.v1 import auth, categorias, establecimientos, potreros

_log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(establecimientos.router)
router.include_router(potreros.router)
router.include_router(categorias.router)

try:
    from app.routers.v1 import animales, importaciones
    router.include_router(animales.router)
    router.include_router(importaciones.router)
    _log.info("SPRINT2: routers animales e importaciones cargados OK")
except Exception:
    _log.error("SPRINT2: ERROR cargando routers animales/importaciones:\n%s", traceback.format_exc())
