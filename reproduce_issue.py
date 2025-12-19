
import asyncio
import os
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

# Mock data
REQUESTER_ID = ObjectId()
FETCHER_ID = ObjectId()

# Database Config (Assuming local default or grab from env if provided, but for this script we might need to mock or reuse existing)
# We will use a temporary collection to avoid messing with real data
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "yaarfetch_test_repro"

async def run_test():
    print(f"Connecting to {MONGO_URL}...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Clean up
    await db.orders.delete_many({})
    
    # 1. Create Order
    print("\n--- Step 1: Create Order ---")
    order_doc = {
        "item": "Test Item",
        "dropoff_location": "Hostel 1",
        "requester_id": REQUESTER_ID,
        "fetcher_id": None,
        "status": "open",
        "created_at": datetime.utcnow()
    }
    res = await db.orders.insert_one(order_doc)
    order_id = res.inserted_id
    print(f"Order created: {order_id}")
    
    # 2. Accept Order (Simulating /accept endpoint logic)
    print("\n--- Step 2: Accept Order ---")
    # Endpoint logic: find_one_and_update matching _id and status=open
    updated = await db.orders.find_one_and_update(
        {"_id": order_id, "status": "open"},
        {"$set": {"status": "accepted", "fetcher_id": FETCHER_ID}},
        return_document=True 
    )
    
    if updated and updated["status"] == "accepted" and updated["fetcher_id"] == FETCHER_ID:
        print("SUCCESS: Order accepted and fetcher_id set.")
    else:
        print(f"FAILURE: Accept update failed. Doc: {updated}")
        return

    # 3. Submit Payment (Requester)
    print("\n--- Step 3: Submit Payment ---")
    updated = await db.orders.find_one_and_update(
        {"_id": order_id},
        {"$set": {
            "payment_sent": True,
            "txn_id": "TX123",
            "paid_to_platform": True
        }},
        return_document=True
    )
    if updated.get("payment_sent") and updated.get("txn_id") == "TX123":
        print("SUCCESS: Payment details saved.")
    else:
        print("FAILURE: Payment details not saved.")
        return

    # 4. Mark Delivered (Requester confirms)
    print("\n--- Step 4: Confirm Delivery ---")
    updated = await db.orders.find_one_and_update(
        {"_id": order_id},
        {"$set": {"status": "delivered"}},
        return_document=True
    )
    if updated["status"] == "delivered":
        print("SUCCESS: Status updated to delivered.")
    else:
        print("FAILURE: Status update failed.")

    # 5. Submit Payout Details (Fetcher)
    print("\n--- Step 5: Submit Payout Details ---")
    payout_payload = {
        "bank_name": "Test Bank",
        "account_number": "1234567890",
        "account_title": "Test User"
    }
    
    # Verify Permissions Logic (Mocking the check)
    # fetcher_id = object_id_to_str(order["fetcher_id"]) ...
    # if current_user != fetcher_id ... 
    # Here we assume permission passed, testing DB write.
    
    updated = await db.orders.find_one_and_update(
        {"_id": order_id},
        {"$set": {
            "fetcher_bank_name": payout_payload["bank_name"],
            "fetcher_account_number": payout_payload["account_number"],
            "fetcher_account_title": payout_payload["account_title"],
            "payout_status": "PENDING"
        }},
        return_document=True
    )
    
    print("Final Document State:")
    print(f"Bank Name: {updated.get('fetcher_bank_name')}")
    print(f"Payout Status: {updated.get('payout_status')}")
    
    if updated.get("fetcher_bank_name") == "Test Bank" and updated.get("payout_status") == "PENDING":
        print("SUCCESS: Payout details persisted correctly.")
    else:
        print("FAILURE: Payout details missing.")

    # Clean up
    await db.orders.delete_many({})
    client.close()

if __name__ == "__main__":
    asyncio.run(run_test())
