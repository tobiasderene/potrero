from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class Paginated(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int


class PaginatedCursor(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    next_cursor: str | None = None
    has_next: bool
