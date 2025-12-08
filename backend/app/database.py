from typing import AsyncGenerator

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import settings


class Database:
    """Mongo client wrapper that keeps a shared connection."""

    def __init__(self) -> None:
        try:
            self.client = AsyncIOMotorClient(settings.mongo_uri)
            self.db = self.client[settings.mongo_db_name]
        except Exception as exc:  # pragma: no cover - defensive
            raise RuntimeError("Failed to initialize Mongo client") from exc

    async def get_db(self) -> AsyncGenerator[AsyncIOMotorDatabase, None]:
        try:
            yield self.db
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database connection error",
            ) from exc

    def close(self) -> None:
        self.client.close()


database = Database()

