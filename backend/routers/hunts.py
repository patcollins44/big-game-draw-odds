"""Hunt and draw result endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/hunts", tags=["hunts"])


@router.get("", response_model=List[schemas.HuntOut])
def list_hunts(
    state: Optional[str] = Query(None, description="State code, e.g. CO"),
    species: Optional[str] = Query(None),
    weapon_type: Optional[str] = Query(None),
    unit: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Hunt).options(joinedload(models.Hunt.state))
    if state:
        q = q.join(models.State).filter(models.State.code == state.upper())
    if species:
        q = q.filter(models.Hunt.species.ilike(f"%{species}%"))
    if weapon_type:
        q = q.filter(models.Hunt.weapon_type.ilike(f"%{weapon_type}%"))
    if unit:
        q = q.filter(models.Hunt.unit.ilike(f"%{unit}%"))
    return q.order_by(models.Hunt.species, models.Hunt.unit).all()


@router.get("/{hunt_id}", response_model=schemas.HuntOut)
def get_hunt(hunt_id: int, db: Session = Depends(get_db)):
    hunt = (
        db.query(models.Hunt)
        .options(joinedload(models.Hunt.state))
        .filter(models.Hunt.id == hunt_id)
        .first()
    )
    if not hunt:
        raise HTTPException(404, "Hunt not found")
    return hunt


@router.get("/{hunt_id}/draw-results", response_model=List[schemas.DrawResultOut])
def get_draw_results(
    hunt_id: int,
    applicant_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(models.DrawResult)
        .options(joinedload(models.DrawResult.point_buckets))
        .filter(models.DrawResult.hunt_id == hunt_id)
    )
    if applicant_type:
        q = q.filter(models.DrawResult.applicant_type == applicant_type)
    return q.order_by(models.DrawResult.year.desc()).all()


# ── States ─────────────────────────────────────────────────────────────────

states_router = APIRouter(prefix="/api/states", tags=["states"])


@states_router.get("", response_model=List[schemas.StateOut])
def list_states(db: Session = Depends(get_db)):
    return db.query(models.State).order_by(models.State.name).all()


@states_router.get("/{code}/species")
def list_species(code: str, db: Session = Depends(get_db)):
    state = db.query(models.State).filter(models.State.code == code.upper()).first()
    if not state:
        raise HTTPException(404, "State not found")
    rows = (
        db.query(models.Hunt.species, models.Hunt.weapon_type)
        .filter(models.Hunt.state_id == state.id, models.Hunt.is_active == True)
        .distinct()
        .all()
    )
    # Deduplicate species
    species_set = sorted({r.species for r in rows})
    return {"state": code.upper(), "species": species_set}
