from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..dependencies import get_current_user, get_db
from ..schemas import Token, UserCreate, UserLogin, UserPublic
from ..security import create_access_token, get_password_hash, verify_password
from ..utils import object_id_to_str, user_to_public

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        existing = await db.users.find_one({"email": payload.email.lower().strip()})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
            )

        user_doc = {
            "name": payload.name.strip(),
            "email": payload.email.lower().strip(),
            "password": get_password_hash(payload.password),
            "created_at": datetime.utcnow(),
        }
        result = await db.users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id

        public_user = user_to_public(user_doc)
        token = create_access_token({"sub": object_id_to_str(public_user["id"])})
        return Token(access_token=token, user=UserPublic(**public_user))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to register user",
        ) from exc


@router.post("/login", response_model=Token)
async def login_user(payload: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        user = await db.users.find_one({"email": payload.email.lower().strip()})
        if not user or not verify_password(payload.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        public_user = user_to_public(user)
        token = create_access_token({"sub": object_id_to_str(public_user["id"])})
        return Token(access_token=token, user=UserPublic(**public_user))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to login",
        ) from exc


@router.get("/me", response_model=UserPublic)
async def get_me(current_user=Depends(get_current_user)):
    try:
        return UserPublic(**current_user)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to fetch profile",
        ) from exc


