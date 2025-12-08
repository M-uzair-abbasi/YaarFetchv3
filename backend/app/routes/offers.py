from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..dependencies import get_current_user, get_db
from ..schemas import OfferCreate, OfferPublic
from ..utils import order_to_public, to_object_id

router = APIRouter()

@router.post("", response_model=OfferPublic, status_code=status.HTTP_201_CREATED)
async def create_offer(
    payload: OfferCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        offer_doc = payload.model_dump()
        offer_doc["fetcher_id"] = to_object_id(current_user["id"])
        offer_doc["created_at"] = datetime.utcnow()
        
        result = await db.offers.insert_one(offer_doc)
        offer_doc["_id"] = result.inserted_id
        
        # Reuse order_to_public utility since it just converts _id to id and handles ObjectId
        return OfferPublic(**order_to_public(offer_doc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create offer",
        ) from exc

@router.get("", response_model=List[OfferPublic])
async def list_offers(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        # Fetch recent offers, limited to 50 for now
        cursor = db.offers.find().sort("created_at", -1).limit(50)
        offers = await cursor.to_list(length=50)
        return [OfferPublic(**order_to_public(offer)) for offer in offers]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to fetch offers",
        ) from exc
