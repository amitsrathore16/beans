from __future__ import annotations
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class LogType(str, Enum):
    home = "home"
    cafe = "cafe"


class DuplicateMode(str, Enum):
    exact = "exact"
    log_with_changes = "log_with_changes"


class LogCreate(BaseModel):
    log_type: LogType
    coffee_name: str
    roaster: Optional[str] = None
    roast_level: Optional[str] = None
    origin: Optional[str] = None
    brew_method: Optional[str] = None
    body: Optional[str] = None
    mouthfeel: Optional[str] = None
    acidity: Optional[str] = None
    finish: Optional[str] = None
    flavour_tags: Optional[List[str]] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    # Home-only
    machine: Optional[str] = None
    grinder: Optional[str] = None
    dose_g: Optional[float] = None
    yield_g: Optional[float] = None
    brew_time_s: Optional[int] = None
    grind_size: Optional[str] = None
    water_temp_c: Optional[float] = None
    duplicated_from: Optional[str] = None
    # Café-only
    cafe_name: Optional[str] = None
    location: Optional[str] = None
    would_return: Optional[str] = None


class LogSaveRequest(BaseModel):
    log: LogCreate
    deduct_inventory: bool = False
    confirmed_bean_id: Optional[str] = None


class InventoryMatch(BaseModel):
    bean_id: str
    bean_name: str
    remaining_before_g: float
    remaining_after_g: float
    low_stock_warning: bool


class LogSaveResponse(BaseModel):
    log_id: str
    inventory_match: Optional[InventoryMatch] = None


class DuplicateRequest(BaseModel):
    mode: DuplicateMode


class DuplicateResponse(BaseModel):
    new_log_id: str
    mode: DuplicateMode


class BeanMatchResponse(BaseModel):
    matched: bool
    bean_id: Optional[str] = None
    bean_name: Optional[str] = None
    remaining_before_g: Optional[float] = None
    remaining_after_g: Optional[float] = None
    low_stock_warning: Optional[bool] = None


class InventoryDeductRequest(BaseModel):
    bean_id: str
    log_id: str
    dose_g: float


class InventoryDeductResponse(BaseModel):
    success: bool
    remaining_weight_g: float
    low_stock_warning: bool
