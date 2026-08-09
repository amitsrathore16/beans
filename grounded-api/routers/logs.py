from fastapi import APIRouter, Depends, HTTPException, Request
from models import (
    LogSaveRequest, LogSaveResponse, DuplicateRequest, DuplicateResponse,
    InventoryMatch, LogType, LogUpdateRequest, LogUpdateResponse, ReattributionPreview,
)
from dependencies import get_current_user
from database import get_supabase, find_bean_by_name
from limiter import limiter

router = APIRouter(prefix="/api/v1/logs", tags=["logs"])

SENSORY_FIELDS = ["sensory_profile", "rating", "notes"]


@router.post("", response_model=LogSaveResponse)
@limiter.limit("120/minute")
async def save_log(request: Request, payload: LogSaveRequest, user_id: str = Depends(get_current_user)):
    db = get_supabase()
    data = payload.log.model_dump(exclude_none=True)
    data["user_id"] = user_id

    result = db.table("logs").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to insert log")

    log_id = result.data[0]["id"]
    inventory_match = None

    if payload.log.log_type == LogType.home and payload.deduct_inventory:
        if payload.confirmed_bean_id:
            # User explicitly confirmed a specific bean — fetch by ID (with ownership check)
            res = (
                db.table("beans")
                .select("id, name, remaining_weight_g")
                .eq("id", payload.confirmed_bean_id)
                .eq("user_id", user_id)
                .is_("deleted_at", "null")
                .execute()
            )
            match = res.data[0] if res.data else None
        else:
            match = find_bean_by_name(db, user_id, payload.log.coffee_name)

        if match:
            dose = payload.log.dose_g or 0
            inventory_match = InventoryMatch(
                bean_id=match["id"],
                bean_name=match["name"],
                remaining_before_g=match["remaining_weight_g"],
                remaining_after_g=match["remaining_weight_g"] - dose,
                low_stock_warning=(match["remaining_weight_g"] - dose) < 50,
            )

    return LogSaveResponse(log_id=log_id, inventory_match=inventory_match)


def _update_log_fields(db, log_id: str, user_id: str, data: dict):
    result = (
        db.table("logs")
        .update(data)
        .eq("id", log_id)
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Log not found")


@router.patch("/{log_id}", response_model=LogUpdateResponse, response_model_exclude_none=True)
@limiter.limit("120/minute")
async def update_log(request: Request, log_id: str, payload: LogUpdateRequest, user_id: str = Depends(get_current_user)):
    db = get_supabase()
    data = payload.log.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No editable fields provided")

    existing = (
        db.table("logs")
        .select("coffee_name, log_type")
        .eq("id", log_id).eq("user_id", user_id).is_("deleted_at", "null")
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Log not found")
    current = existing.data[0]

    new_name = data.get("coffee_name")
    name_changed = new_name is not None and new_name != current["coffee_name"]

    # Inventory re-attribution only applies to a home brew whose coffee_name changes
    # AND which currently has a live deduction. Everything else is a plain field update.
    if current["log_type"] == LogType.home and name_changed:
        # The bean currently holding this log's deduction = the one whose ledger
        # rows for this log net to a negative weight. (Manual adjustments have
        # log_id NULL, so they're excluded.)
        events = (
            db.table("inventory_events")
            .select("bean_id, delta_g")
            .eq("log_id", log_id).eq("user_id", user_id)
            .execute()
        )
        net: dict[str, float] = {}
        for row in events.data or []:
            net[row["bean_id"]] = net.get(row["bean_id"], 0.0) + float(row["delta_g"])
        active = [(bid, s) for bid, s in net.items() if s < -1e-9]

        if active:
            old_bean_id, net_sum = active[0]
            dose = -net_sum
            new_bean = find_bean_by_name(db, user_id, new_name)

            # Block if the new bean can't cover the (locked) dose.
            if new_bean and new_bean["remaining_weight_g"] < dose:
                raise HTTPException(
                    status_code=422,
                    detail=f"Not enough stock in {new_bean['name']}: "
                           f"{new_bean['remaining_weight_g']}g remaining, {dose}g needed",
                )

            if not payload.confirm_reattribution:
                # Phase 1 — preview only, save nothing.
                old_row = (
                    db.table("beans").select("name")
                    .eq("id", old_bean_id).eq("user_id", user_id).execute()
                )
                old_name = old_row.data[0]["name"] if old_row.data else "Unknown"
                return LogUpdateResponse(
                    log_id=log_id,
                    reattribution=ReattributionPreview(
                        from_bean_id=old_bean_id,
                        from_bean_name=old_name,
                        to_bean_id=new_bean["id"] if new_bean else None,
                        to_bean_name=new_bean["name"] if new_bean else None,
                        dose_g=dose,
                    ),
                )

            # Phase 2 — confirmed. Move stock atomically first (it can fail/block),
            # then persist the field edit.
            # ponytail: two calls, not one txn — negligible window, both are the user's rows.
            res = db.rpc("reattribute_brew_stock", {
                "p_log_id":      log_id,
                "p_user_id":     user_id,
                "p_old_bean_id": old_bean_id,
                "p_new_bean_id": new_bean["id"] if new_bean else None,
                "p_dose_g":      float(dose),
            }).execute()
            if not res.data or not res.data[0]["success"]:
                raise HTTPException(
                    status_code=422,
                    detail=f"Not enough stock in {new_bean['name']}" if new_bean else "Bean not found",
                )

    _update_log_fields(db, log_id, user_id, data)
    return LogUpdateResponse(log_id=log_id)


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
