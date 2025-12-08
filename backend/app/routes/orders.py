from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from ..dependencies import get_current_user, get_db
from ..schemas import OrderCreate, OrderPublic, OrderStatusUpdate
from ..utils import object_id_to_str, order_to_public, to_object_id

router = APIRouter()

VALID_STATUSES = {"open", "accepted", "picked_up", "delivered"}


@router.post("", response_model=OrderPublic, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        order_doc = {
            "item": payload.item.strip(),
            "dropoff_location": payload.dropoff_location.strip(),
            "instructions": payload.instructions.strip() if payload.instructions else None,
            "requester_id": to_object_id(current_user["id"]),
            "fetcher_id": None,
            "target_offer_id": to_object_id(payload.target_offer_id) if payload.target_offer_id else None,
            "status": "open",
            "created_at": datetime.utcnow(),
        }
        result = await db.orders.insert_one(order_doc)
        order_doc["_id"] = result.inserted_id
        return OrderPublic(**order_to_public(order_doc))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create order",
        ) from exc


@router.get("", response_model=List[OrderPublic])
async def list_orders(
    status_filter: Optional[str] = None,
    target_offer_id: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        query = {}
        if status_filter:
            if status_filter not in VALID_STATUSES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter"
                )
            query["status"] = status_filter
        
        if target_offer_id:
            query["target_offer_id"] = to_object_id(target_offer_id)

        orders_cursor = db.orders.find(query).sort("created_at", -1)
        orders = await orders_cursor.to_list(length=100)
        return [OrderPublic(**order_to_public(order)) for order in orders]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to fetch orders",
        ) from exc


@router.post("/{order_id}/accept", response_model=OrderPublic)
async def accept_order(
    order_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        oid = to_object_id(order_id)
        update_result = await db.orders.find_one_and_update(
            {"_id": oid, "status": "open"},
            {"$set": {"status": "accepted", "fetcher_id": to_object_id(current_user["id"])}},
            return_document=ReturnDocument.AFTER,
        )
        if not update_result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order not available for acceptance",
            )
        return OrderPublic(**order_to_public(update_result))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to accept order",
        ) from exc


@router.patch("/{order_id}/status", response_model=OrderPublic)
async def update_status(
    order_id: str,
    payload: OrderStatusUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        if payload.status not in VALID_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status value"
            )

        oid = to_object_id(order_id)
        order = await db.orders.find_one({"_id": oid})
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )

        # Only requester or fetcher can change status
        requester_id = object_id_to_str(order["requester_id"])
        fetcher_id = object_id_to_str(order["fetcher_id"]) if order.get("fetcher_id") else None
        if current_user["id"] not in {requester_id, fetcher_id}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to update this order",
            )

        updated = await db.orders.find_one_and_update(
            {"_id": oid},
            {"$set": {"status": payload.status}},
            return_document=ReturnDocument.AFTER,
        )
        return OrderPublic(**order_to_public(updated))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update order status",
        ) from exc


