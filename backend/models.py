"""
SQLAlchemy ORM models for the Draw Odds application.

Schema overview:
  State → Hunt → DrawResult (one per year)
  DrawResult → PointBucketResult (one per preference-point level, per year)
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, ForeignKey, UniqueConstraint, Text
)
from sqlalchemy.orm import relationship
from database import Base


class State(Base):
    __tablename__ = "states"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(2), unique=True, nullable=False, index=True)   # e.g. "CO"
    name = Column(String(100), nullable=False)
    points_system = Column(String(50))   # "preference" | "bonus" | "random" | "hybrid"
    max_points = Column(Integer, default=99)
    notes = Column(Text)                 # Quirks unique to this state
    data_source_url = Column(String(500))

    hunts = relationship("Hunt", back_populates="state", cascade="all, delete-orphan")


class Hunt(Base):
    """
    Represents a specific draw hunt — unique combination of
    state + species + unit + weapon_type + season.
    """
    __tablename__ = "hunts"
    __table_args__ = (
        UniqueConstraint("state_id", "hunt_code", name="uq_state_hunt_code"),
    )

    id = Column(Integer, primary_key=True, index=True)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    hunt_code = Column(String(50), nullable=False, index=True)   # Official state code
    unit = Column(String(50))              # GMU / unit name
    species = Column(String(50), nullable=False, index=True)     # elk, deer, antelope …
    subspecies = Column(String(50))        # bull, buck, ram, etc.
    weapon_type = Column(String(30))       # rifle, archery, muzzleloader
    season_number = Column(Integer)        # 1st, 2nd, 3rd, 4th season
    hunt_type = Column(String(30))         # limited, otc, draw
    description = Column(Text)
    is_active = Column(Boolean, default=True)

    state = relationship("State", back_populates="hunts")
    draw_results = relationship("DrawResult", back_populates="hunt", cascade="all, delete-orphan")


class DrawResult(Base):
    """
    Aggregate draw statistics for a single hunt in a single year.
    """
    __tablename__ = "draw_results"
    __table_args__ = (
        UniqueConstraint("hunt_id", "year", "applicant_type", name="uq_hunt_year_type"),
    )

    id = Column(Integer, primary_key=True, index=True)
    hunt_id = Column(Integer, ForeignKey("hunts.id"), nullable=False)
    year = Column(Integer, nullable=False, index=True)
    applicant_type = Column(String(20), nullable=False)  # "resident" | "nonresident"

    tags_available = Column(Integer)
    total_applicants = Column(Integer)
    min_points_drawn = Column(Integer)       # Minimum preference points that drew a tag
    avg_points_drawn = Column(Float)         # Average points among successful applicants
    max_points_in_pool = Column(Integer)     # Highest points anyone applied with

    # Derived / summary
    overall_odds = Column(Float)             # tags_available / total_applicants

    hunt = relationship("Hunt", back_populates="draw_results")
    point_buckets = relationship(
        "PointBucketResult", back_populates="draw_result", cascade="all, delete-orphan"
    )


class PointBucketResult(Base):
    """
    Per-preference-point-level breakdown within a single DrawResult.
    e.g.  Year 2023, Resident, 5 points → 142 applicants, 38 successful
    """
    __tablename__ = "point_bucket_results"
    __table_args__ = (
        UniqueConstraint("draw_result_id", "points", name="uq_draw_result_points"),
    )

    id = Column(Integer, primary_key=True, index=True)
    draw_result_id = Column(Integer, ForeignKey("draw_results.id"), nullable=False)
    points = Column(Integer, nullable=False)      # 0-based preference points
    applicants = Column(Integer, default=0)
    successful = Column(Integer, default=0)
    odds = Column(Float)                          # successful / applicants (computed on insert)

    draw_result = relationship("DrawResult", back_populates="point_buckets")
