from fastapi import APIRouter, Depends, HTTPException, Request
from models import (
    BeanMatchResponse, InventoryDeductRequest, InventoryDeductResponse,
    InventoryAdjustRequest,
)
from dependencies import get_current_user
from database import get_supabase, find_bean_by_name
from limiter import limiter

router = APIRouter(prefix="/api/v1", tags=["inventory"])

LOW_STOCK_THRESHOLD_G = 50.0


@router.get("/beans/match", response_model=BeanMatchResponse, response_model_exclude_none=True)
async def match_bean(name: str, dose_g: float = 0, user_id: str = Depends(get_current_user)):
    db = get_supabase()
    match = find_bean_by_name(db, user_id, name)
    if not match:
        return BeanMatchResponse(matched=False)

    remaining_after = match["remaining_weight_g"] - dose_g
    return BeanMatchResponse(
        matched=True,
        bean_id=match["id"],
        bean_name=match["name"],
        remaining_before_g=match["remaining_weight_g"],
        remaining_after_g=remaining_after,
        low_stock_warning=remaining_after < LOW_STOCK_THRESHOLD_G,
    )


@router.post("/inventory/deduct", response_model=InventoryDeductResponse)
@limiter.limit("60/minute")
async def deduct_inventory(request: Request, payload: InventoryDeductRequest, user_id: str = Depends(get_current_user)):
    db = get_supabase()

    # Single atomic RPC: locks the row, checks stock, and deducts in one transaction.
    # Eliminates the TOCTOU race that existed when read and update were separate calls.
    result = db.rpc("deduct_bean_stock", {
        "p_bean_id": str(payload.bean_id),
        "p_user_id": user_id,
        "p_dose_g":  float(payload.dose_g),
    }).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Bean not found")

    row = result.data[0]
    if not row["success"]:
        remaining = row["remaining_weight_g"]
        raise HTTPException(
            status_code=422,
            detail=f"Insufficient stock: {remaining}g remaining, {payload.dose_g}g requested",
        )

    new_remaining   = row["remaining_weight_g"]
    weight_before   = row["weight_before_g"]

    db.table("inventory_events").insert({
        "user_id":        user_id,
        "bean_id":        str(payload.bean_id),
        "log_id":         str(payload.log_id),
        "delta_g":        -payload.dose_g,
        "weight_before_g": weight_before,
        "weight_after_g":  new_remaining,
        "source":         "brew_save",
    }).execute()

    return InventoryDeductResponse(
        success=True,
        remaining_weight_g=new_remaining,
        low_stock_warning=new_remaining < LOW_STOCK_THRESHOLD_G,
    )


@router.post("/inventory/adjust", response_model=InventoryDeductResponse)
@limiter.limit("60/minute")
async def adjust_inventory(request: Request, payload: InventoryAdjustRequest, user_id: str = Depends(get_current_user)):
    db = get_supabase()

    # Atomic: locks the row, enforces decrease-only, and sets the new weight.
    result = db.rpc("adjust_bean_stock", {
        "p_bean_id":      str(payload.bean_id),
        "p_user_id":      user_id,
        "p_new_weight_g": float(payload.new_weight_g),
    }).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Bean not found")

    row = result.data[0]
    if not row["success"]:
        raise HTTPException(
            status_code=422,
            detail="Inventory can only be reduced. To increase stock, add a new bean bag.",
        )

    new_remaining = row["remaining_weight_g"]
    weight_before = row["weight_before_g"]

    # Manual adjustment — no log_id; source distinguishes it from brew deductions.
    db.table("inventory_events").insert({
        "user_id":         user_id,
        "bean_id":         str(payload.bean_id),
        "log_id":          None,
        "delta_g":         new_remaining - weight_before,
        "weight_before_g": weight_before,
        "weight_after_g":  new_remaining,
        "source":          "manual_adjustment",
    }).execute()

    return InventoryDeductResponse(
        success=True,
        remaining_weight_g=new_remaining,
        low_stock_warning=new_remaining < LOW_STOCK_THRESHOLD_G,
    )
