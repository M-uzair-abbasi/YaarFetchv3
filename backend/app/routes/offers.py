from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from ..dependencies import get_current_user, get_db
from ..schemas import OfferCreate, OfferPublic, OfferUpdate
from ..utils import offer_to_public, to_object_id, object_id_to_str

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
        return OfferPublic(**offer_to_public(offer_doc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create offer",
        ) from exc

@router.delete("/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_offer(
    offer_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        oid = to_object_id(offer_id)
        offer = await db.offers.find_one({"_id": oid})
        if not offer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found"
            )
        
        # Ownership check
        if object_id_to_str(offer["fetcher_id"]) != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this offer"
            )
            
        await db.offers.delete_one({"_id": oid})
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete offer",
        ) from exc


@router.patch("/{offer_id}", response_model=OfferPublic)
async def update_offer(
    offer_id: str,
    payload: OfferUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        oid = to_object_id(offer_id)
        offer = await db.offers.find_one({"_id": oid})
        if not offer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found"
            )

        # Ownership check
        if object_id_to_str(offer["fetcher_id"]) != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this offer"
            )

        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            return OfferPublic(**offer_to_public(offer))

        updated = await db.offers.find_one_and_update(
            {"_id": oid},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER,
        )
        return OfferPublic(**offer_to_public(updated))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update offer",
        ) from exc
@router.get("", response_model=List[OfferPublic])
async def list_offers(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        # Fetch recent offers, limited to 50 for now
        cursor = db.offers.find().sort("created_at", -1).limit(50)
        offers = await cursor.to_list(length=50)
        return [OfferPublic(**offer_to_public(offer)) for offer in offers]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to fetch offers",
        ) from exc
