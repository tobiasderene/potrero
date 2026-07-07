import logging

from jose import JWTError, jwt
from fastapi import HTTPException, status

from app.core.config import settings

ALGORITHM = "HS256"
logger = logging.getLogger(__name__)


def verify_supabase_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[ALGORITHM],
            audience="authenticated",
        )
        return payload
    except JWTError as e:
        logger.warning("JWT verification failed: %s — secret_len=%d token_len=%d",
                       type(e).__name__, len(settings.SUPABASE_JWT_SECRET), len(token))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
