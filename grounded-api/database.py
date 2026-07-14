import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Optional[Client] = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _client = create_client(url, key)
    return _client


def find_bean_by_name(db: Client, user_id: str, name: str):
    result = db.table("beans").select("*").eq("user_id", user_id).is_("deleted_at", "null").execute()
    return next((b for b in (result.data or []) if b["name"].lower() == name.lower()), None)
