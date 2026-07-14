from __future__ import annotations
from enum import Enum
from typing import Annotated, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class LogType(str, Enum):
    home = "home"
    cafe = "cafe"


class DuplicateMode(str, Enum):
    exact = "exact"
    log_with_changes = "log_with_changes"


_Tag = Annotated[str, Field(max_length=100)]


class SensoryProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    aroma:      Optional[List[_Tag]] = Field(default=None, max_length=20)
    flavour:    Optional[List[_Tag]] = Field(default=None, max_length=20)
    acidity:    Optional[List[_Tag]] = Field(default=None, max_length=20)
    body:       Optional[str]        = Field(default=None, max_length=100)
    bitterness: Optional[str]        = Field(default=None, max_length=100)
    mouthfeel:  Optional[str]        = Field(default=None, max_length=100)
    finish:     Optional[List[_Tag]] = Field(default=None, max_length=20)


class LogCreate(BaseModel):
    log_type: LogType
    # Group A — Product
    roaster:     Optional[str] = Field(default=None, max_length=200)
    coffee_name: str           = Field(max_length=200)
    coffee_type: Optional[str] = Field(default=None, max_length=50)
    # Group B — Origin
    origin_country: Optional[str] = Field(default=None, max_length=100)
    origin_region:  Optional[str] = Field(default=None, max_length=200)
    # Group C — Bean Profile
    species:        Optional[str] = Field(default=None, max_length=100)
    process_method: Optional[str] = Field(default=None, max_length=100)
    varietal:       Optional[str] = Field(default=None, max_length=200)
    # Group D — Roast Profile
    roast_level: Optional[str] = Field(default=None, max_length=50)
    roast_date:  Optional[str] = Field(default=None, max_length=10)   # YYYY-MM-DD
    # Equipment
    brew_method: Optional[str] = Field(default=None, max_length=100)
    equipment:   Optional[str] = Field(default=None, max_length=200)
    # Grind
    grinder:    Optional[str] = Field(default=None, max_length=200)
    grind_size: Optional[str] = Field(default=None, max_length=50)
    # Extraction — dose_g must be positive to prevent stock inflation via negative values
    dose_g:             Optional[float] = Field(default=None, gt=0)
    coffee_water_ratio: Optional[str]   = Field(default=None, max_length=20)
    ideal_yield_g:      Optional[float] = Field(default=None, gt=0)
    actual_yield_g:     Optional[float] = Field(default=None, gt=0)
    brew_time_s:        Optional[int]   = None
    water_temp_c:       Optional[float] = None
    # Sensory — typed model rejects unknown keys and caps list/string lengths
    sensory_profile: Optional[SensoryProfile] = None
    # Overall
    rating:         Optional[int] = Field(default=None, ge=1, le=5)
    notes:          Optional[str] = Field(default=None, max_length=5000)
    duplicated_from:Optional[str] = Field(default=None, max_length=36)
    # Café-only
    cafe_name:   Optional[str] = Field(default=None, max_length=200)
    location:    Optional[str] = Field(default=None, max_length=500)
    would_return:Optional[str] = None


class LogSaveRequest(BaseModel):
    log: LogCreate
    deduct_inventory: bool = False
    confirmed_bean_id: Optional[str] = Field(default=None, max_length=36)


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
    bean_id: str = Field(max_length=36)
    log_id:  str = Field(max_length=36)
    dose_g:  float = Field(gt=0)   # positive guard prevents stock inflation


class InventoryDeductResponse(BaseModel):
    success: bool
    remaining_weight_g: float
    low_stock_warning: bool
