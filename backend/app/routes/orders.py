from datetime import datetime
from typing import List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from ..dependencies import get_current_user, get_db
from ..schemas import OrderCreate, OrderPublic, OrderStatusUpdate
from ..utils import object_id_to_str, order_to_public, to_object_id

router = APIRouter()

VALID_STATUSES = {"open", "accepted", "picked_up", "delivered"}


async def enrich_orders(orders: List[dict], db: AsyncIOMotorDatabase, current_user_id: str) -> List[dict]:
    """
    Populates requester_name, fetcher_name, and conditionally requester_contact, fetcher_contact
    based on the current user's relation to the order and the order status.
    """
    if not orders:
        return []

    # Collect user IDs
    user_ids = set()
    for o in orders:
        if "requester_id" in o:
            user_ids.add(o["requester_id"])
        if "fetcher_id" in o:
            user_ids.add(o["fetcher_id"])
    
    # Fetch users
    users = {}
    if user_ids:
        cursor = db.users.find({"_id": {"$in": list(user_ids)}})
        async for user in cursor:
            users[str(user["_id"])] = user

    enriched = []
    for order in orders:
        # Base conversion
        public_order = order_to_public(order)
        
        # Helper IDs
        req_id = public_order["requester_id"]
        fet_id = public_order["fetcher_id"]
        status = public_order["status"]

        # Populate Names
        if req_id in users:
            public_order["requester_name"] = users[req_id].get("name")
        
        if fet_id and fet_id in users:
            public_order["fetcher_name"] = users[fet_id].get("name")

        # Visibility Logic for Contact Info
        # Visible if: (I am Requester OR I am Fetcher) AND Status is accepted/picked_up/delivered
        # Note: If status is 'open', contacts are hidden even if I am the requester (though I know my own number, the UI might not need it displayed generally, but harmless to show to self). 
        # Let's say strictly: contacts shared when matched.
        
        is_participant = (current_user_id == req_id) or (current_user_id == fet_id)
        is_matched = status in {"accepted", "picked_up", "delivered"}

        if is_participant and is_matched:
            # Show contacts
            if req_id in users:
                public_order["requester_contact"] = users[req_id].get("phone_number")
            if fet_id and fet_id in users:
                public_order["fetcher_contact"] = users[fet_id].get("phone_number")
        elif current_user_id == req_id:
            # I am requester, I can see my own contact always? Sure.
             if req_id in users:
                public_order["requester_contact"] = users[req_id].get("phone_number")

        enriched.append(public_order)
    
    return enriched


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
            "target_fetcher_id": to_object_id(payload.target_fetcher_id) if payload.target_fetcher_id else None,
            "status": "open",
            "created_at": datetime.utcnow(),
        }
        result = await db.orders.insert_one(order_doc)
        order_doc["_id"] = result.inserted_id
        
        enriched = await enrich_orders([order_doc], db, current_user["id"])
        return OrderPublic(**enriched[0])
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
        
        # Task 1: Self-Exclusion - if status_filter is open, exclude my own orders
        if status_filter == "open":
            query["requester_id"] = {"$ne": to_object_id(current_user["id"])}
        
        # Task 2: Targeted Visibility
        # If I am viewing open orders:
        # - Show orders targeted to ME
        # - Show public orders (target_fetcher_id is None)
        # - HIDE orders targeted to OTHERS
        # Logic: (target_fetcher_id == current_user_id) OR (target_fetcher_id == None)
        
        # Note: If target_offer_id is provided in params, we trust the client filter, 
        # but we should still respect visibility rules.
        
        if status_filter == "open":
            cid = to_object_id(current_user["id"])
            # We already have requester_id != cid from above.
            # Adding OR condition for targeting
            query["$and"] = [
                {"requester_id": {"$ne": cid}}, # Double check
                {"$or": [
                    {"target_fetcher_id": cid},
                    {"target_fetcher_id": None},
                    {"target_fetcher_id": {"$exists": False}}
                ]}
            ]

        if target_offer_id:
            query["target_offer_id"] = to_object_id(target_offer_id)

        orders_cursor = db.orders.find(query).sort("created_at", -1)
        orders = await orders_cursor.to_list(length=100)
        
        enriched = await enrich_orders(orders, db, current_user["id"])
        return [OrderPublic(**o) for o in enriched]
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
        
        enriched = await enrich_orders([update_result], db, current_user["id"])
        return OrderPublic(**enriched[0])
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

        # Task 3: Restrict Status Changes
        # Only the assigned fetcher can update status (to picked_up, delivered)
        # Requester CANNOT change status (unless perhaps cancelling, but that is not in this scope).
        # We assume this endpoint is for progressing the order.
        
        fetcher_id = object_id_to_str(order["fetcher_id"]) if order.get("fetcher_id") else None
        
        # If the order is accepted, only the fetcher can move it forward.
        if current_user["id"] != fetcher_id:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned fetcher can update the status",
            )

        updated = await db.orders.find_one_and_update(
            {"_id": oid},
            {"$set": {"status": payload.status}},
            return_document=ReturnDocument.AFTER,
        )
        
        enriched = await enrich_orders([updated], db, current_user["id"])
        return OrderPublic(**enriched[0])
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update order status",
        ) from exc


