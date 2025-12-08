from typing import Any, Dict

from bson import ObjectId


def to_object_id(value: Any) -> ObjectId:
    """Convert id-like value into a real ObjectId."""
    return value if isinstance(value, ObjectId) else ObjectId(str(value))


def object_id_to_str(value: Any) -> str:
    return str(value) if isinstance(value, ObjectId) else str(ObjectId(value))


def user_to_public(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": object_id_to_str(user.get("_id")),
        "name": user.get("name"),
        "email": user.get("email"),
    }


def order_to_public(order: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": object_id_to_str(order.get("_id")),
        "item": order.get("item"),
        "dropoff_location": order.get("dropoff_location"),
        "instructions": order.get("instructions"),
        "requester_id": object_id_to_str(order.get("requester_id")),
        "fetcher_id": object_id_to_str(order["fetcher_id"]) if order.get("fetcher_id") else None,
        "target_offer_id": object_id_to_str(order.get("target_offer_id")) if order.get("target_offer_id") else None,
        "status": order.get("status"),
        "created_at": order.get("created_at"),
    }


def offer_to_public(offer: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": object_id_to_str(offer.get("_id")),
        "fetcher_id": object_id_to_str(offer.get("fetcher_id")),
        "current_location": offer.get("current_location"),
        "destination": offer.get("destination"),
        "arrival_time": offer.get("arrival_time"),
        "pickup_capability": offer.get("pickup_capability"),
        "contact_number": offer.get("contact_number"),
        "delivery_charge": offer.get("delivery_charge"),
        "estimated_delivery_time": offer.get("estimated_delivery_time"),
        "notes": offer.get("notes"),
        "created_at": offer.get("created_at"),
    }


def chat_to_public(chat: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": object_id_to_str(chat.get("_id")),
        "order_id": object_id_to_str(chat.get("order_id")),
        "sender_id": object_id_to_str(chat.get("sender_id")),
        "sender_name": chat.get("sender_name"),
        "content": chat.get("content"),
        "created_at": chat.get("created_at"),
    }

