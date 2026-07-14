from fastapi import APIRouter, Depends, HTTPException
from models import (
    LogSaveRequest, LogSaveResponse, DuplicateRequest, DuplicateResponse,
    InventoryMatch, LogType,
)
from dependencies import get_current_user
from database import get_supabase, find_bean_by_name

router = APIRouter(prefix="/api/v1/logs", tags=["logs"])

SENSORY_FIELDS = ["sensory_profile", "rating", "notes"]


@router.post("", response_model=LogSaveResponse)
async def save_log(payload: LogSaveRequest, user_id: str = Depends(get_current_user)):
    db = get_supabase()
    data = payload.log.model_dump(exclude_none=True)
    data["user_id"] = user_id

    result = db.table("logs").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to insert log")

    log_id = result.data[0]["id"]
    inventory_match = None

    if payload.log.log_type == LogType.home and payload.deduct_inventory:
        match = find_bean_by_name(db, user_id, payload.log.coffee_name)
        if match:
            inventory_match = InventoryMatch(
                bean_id=match["id"],
                bean_name=match["name"],
                remaining_before_g=match["remaining_weight_g"],
                remaining_after_g=match["remaining_weight_g"] - (payload.log.dose_g or 0),
                low_stock_warning=(match["remaining_weight_g"] - (payload.log.dose_g or 0)) < 50,
            )

    return LogSaveResponse(log_id=log_id, inventory_match=inventory_match)


@router.post("/{log_id}/duplicate", response_model=DuplicateResponse)
async def duplicate_log(log_id: str, payload: DuplicateRequest, user_id: str = Depends(get_current_user)):
    db = get_supabase()

    result = db.table("logs").select("*").eq("id", log_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Log not found")

    source = result.data[0]
    if source["log_type"] != LogType.home:
        raise HTTPException(status_code=422, detail="Duplicate is only available for home brew entries (log_type = home)")

    clone = {k: v for k, v in source.items() if k not in ("id", "created_at", "updated_at", "deleted_at", "ratio")}
    clone["duplicated_from"] = log_id

    if payload.mode.value == "log_with_changes":
        for field in SENSORY_FIELDS:
            clone.pop(field, None)

    insert_result = db.table("logs").insert(clone).execute()
    if not insert_result.data:
        raise HTTPException(status_code=500, detail="Failed to create duplicate log")

    return DuplicateResponse(new_log_id=insert_result.data[0]["id"], mode=payload.mode)
