from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from .database import database
from .security import decode_token
from .utils import object_id_to_str, to_object_id, user_to_public

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_db() -> AsyncIOMotorDatabase:
    async for db in database.get_db():
        return db
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database unavailable"
    )


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncIOMotorDatabase = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except HTTPException:
        raise
    except Exception as exc:
        raise credentials_exception from exc

    user = await db.users.find_one({"_id": to_object_id(user_id)})
    if not user:
        raise credentials_exception
    return user_to_public(user)

