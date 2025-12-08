from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    name: str = Field(..., max_length=100)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(UserBase):
    id: str

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class OrderBase(BaseModel):
    item: str = Field(..., max_length=200)
    dropoff_location: str = Field(..., max_length=200)
    instructions: Optional[str] = Field(None, max_length=500)


class OrderCreate(OrderBase):
    pass


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|accepted|picked_up|delivered)$")


class OrderPublic(OrderBase):
    id: str
    requester_id: str
    fetcher_id: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        orm_mode = True

