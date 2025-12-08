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
        "status": order.get("status"),
        "created_at": order.get("created_at"),
    }

