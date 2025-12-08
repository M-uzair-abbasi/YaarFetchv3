from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from ..dependencies import get_current_user, get_db
from ..schemas import ChatCreate, ChatPublic
from ..utils import chat_to_public, object_id_to_str, to_object_id

router = APIRouter()

@router.post("/{order_id}/messages", response_model=ChatPublic, status_code=status.HTTP_201_CREATED)
async def create_message(
    order_id: str,
    payload: ChatCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        oid = to_object_id(order_id)
        # Verify order exists and user is participant
        order = await db.orders.find_one({"_id": oid})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        requester_id = object_id_to_str(order["requester_id"])
        fetcher_id = object_id_to_str(order["fetcher_id"]) if order.get("fetcher_id") else None

        if current_user["id"] not in {requester_id, fetcher_id}:
            raise HTTPException(status_code=403, detail="Not a participant in this order")

        chat_doc = {
            "order_id": oid,
            "sender_id": to_object_id(current_user["id"]),
            "sender_name": current_user["name"],
            "content": payload.content,
            "created_at": datetime.utcnow(),
        }
        
        result = await db.chats.insert_one(chat_doc)
        chat_doc["_id"] = result.inserted_id
        
        return ChatPublic(**chat_to_public(chat_doc))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to send message",
        ) from exc


@router.get("/{order_id}/messages", response_model=List[ChatPublic])
async def list_messages(
    order_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        oid = to_object_id(order_id)
        # Verify order exists and user is participant
        order = await db.orders.find_one({"_id": oid})
        if not order:
             raise HTTPException(status_code=404, detail="Order not found")
        
        requester_id = object_id_to_str(order["requester_id"])
        fetcher_id = object_id_to_str(order["fetcher_id"]) if order.get("fetcher_id") else None

        if current_user["id"] not in {requester_id, fetcher_id}:
             raise HTTPException(status_code=403, detail="Not a participant in this order")

        cursor = db.chats.find({"order_id": oid}).sort("created_at", 1)
        chats = await cursor.to_list(length=1000)
        return [ChatPublic(**chat_to_public(chat)) for chat in chats]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to fetch messages",
        ) from exc
