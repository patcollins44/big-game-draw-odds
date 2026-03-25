"""Pydantic schemas for request/response validation."""
from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field


# ── State ──────────────────────────────────────────────────────────────────

class StateBase(BaseModel):
    code: str
    name: str
    points_system: Optional[str] = None
    max_points: Optional[int] = 99
    notes: Optional[str] = None
    data_source_url: Optional[str] = None

class StateCreate(StateBase):
    pass

class StateOut(StateBase):
    id: int
    model_config = {"from_attributes": True}


# ── Hunt ───────────────────────────────────────────────────────────────────

class HuntBase(BaseModel):
    hunt_code: str
    unit: Optional[str] = None
    species: str
    subspecies: Optional[str] = None
    weapon_type: Optional[str] = None
    season_number: Optional[int] = None
    hunt_type: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

class HuntCreate(HuntBase):
    state_id: int

class HuntOut(HuntBase):
    id: int
    state_id: int
    state: Optional[StateOut] = None
    model_config = {"from_attributes": True}


# ── Point bucket ───────────────────────────────────────────────────────────

class PointBucketOut(BaseModel):
    points: int
    applicants: int
    successful: int
    odds: Optional[float] = None
    model_config = {"from_attributes": True}

class PointBucketCreate(BaseModel):
    points: int
    applicants: int
    successful: int


# ── Draw result ────────────────────────────────────────────────────────────

class DrawResultBase(BaseModel):
    year: int
    applicant_type: str = Field(..., pattern="^(resident|nonresident)$")
    tags_available: Optional[int] = None
    total_applicants: Optional[int] = None
    min_points_drawn: Optional[int] = None
    avg_points_drawn: Optional[float] = None
    max_points_in_pool: Optional[int] = None
    overall_odds: Optional[float] = None

class DrawResultCreate(DrawResultBase):
    hunt_id: int
    point_buckets: List[PointBucketCreate] = []

class DrawResultOut(DrawResultBase):
    id: int
    hunt_id: int
    point_buckets: List[PointBucketOut] = []
    model_config = {"from_attributes": True}


# ── Odds query response ────────────────────────────────────────────────────

class OddsQuery(BaseModel):
    hunt_id: int
    points: int = Field(..., ge=0, le=99)
    applicant_type: str = Field("resident", pattern="^(resident|nonresident)$")

class OddsResult(BaseModel):
    hunt_id: int
    hunt_code: str
    unit: Optional[str]
    species: str
    weapon_type: Optional[str]
    points: int
    applicant_type: str

    # Current year (most recent data)
    latest_year: Optional[int]
    estimated_odds: Optional[float]          # 0.0 – 1.0
    estimated_odds_pct: Optional[str]        # "34.2%"
    min_points_to_draw: Optional[int]

    # Historical trend  [{year, odds_at_your_points, min_pts_drawn}]
    history: List[dict] = []
    confidence: str = "low"                  # low | medium | high (based on years of data)


# ── Bulk import ────────────────────────────────────────────────────────────

class BulkImportResult(BaseModel):
    hunts_created: int = 0
    hunts_updated: int = 0
    draw_results_created: int = 0
    errors: List[str] = []
