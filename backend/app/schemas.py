from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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
    model_config = ConfigDict(from_attributes=True)


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
    model_config = ConfigDict(from_attributes=True)


class OfferBase(BaseModel):
    current_location: str = Field(..., max_length=100)
    destination: str = Field(..., max_length=100)
    arrival_time: str = Field(..., max_length=50)  # Keeping as string for simplicity (e.g., "5:00 PM") or could be datetime
    pickup_capability: str = Field(..., max_length=200)
    contact_number: str = Field(..., max_length=20)
    delivery_charge: Optional[float] = None
    estimated_delivery_time: str = Field(..., max_length=50)
    notes: Optional[str] = Field(None, max_length=500)


class OfferCreate(OfferBase):
    pass


class OfferPublic(OfferBase):
    id: str
    fetcher_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

