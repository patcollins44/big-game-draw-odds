"""
Admin endpoints for data import and management.
Protected by a simple API key header in production.
"""
import json
import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_KEY = os.getenv("ADMIN_API_KEY", "dev-secret-change-me")


def verify_admin(x_api_key: str = Header(...)):
    if x_api_key != ADMIN_KEY:
        raise HTTPException(403, "Invalid API key")


# ── State management ───────────────────────────────────────────────────────

@router.post("/states", response_model=schemas.StateOut, dependencies=[Depends(verify_admin)])
def create_state(payload: schemas.StateCreate, db: Session = Depends(get_db)):
    existing = db.query(models.State).filter(models.State.code == payload.code).first()
    if existing:
        raise HTTPException(400, f"State {payload.code} already exists")
    state = models.State(**payload.model_dump())
    db.add(state)
    db.commit()
    db.refresh(state)
    return state


# ── Bulk JSON import ───────────────────────────────────────────────────────

@router.post("/import/json", response_model=schemas.BulkImportResult,
             dependencies=[Depends(verify_admin)])
async def import_json(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Import hunt + draw result data from a JSON file.

    Expected format:
    {
      "state_code": "CO",
      "hunts": [
        {
          "hunt_code": "EM001O1R",
          "unit": "1",
          "species": "elk",
          "subspecies": "bull",
          "weapon_type": "rifle",
          "season_number": 1,
          "hunt_type": "limited",
          "draw_results": [
            {
              "year": 2023,
              "applicant_type": "resident",
              "tags_available": 50,
              "total_applicants": 312,
              "min_points_drawn": 4,
              "avg_points_drawn": 5.1,
              "point_buckets": [
                {"points": 0, "applicants": 120, "successful": 0},
                {"points": 1, "applicants": 45, "successful": 0},
                ...
              ]
            }
          ]
        }
      ]
    }
    """
    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"Invalid JSON: {e}")

    return _process_import(data, db)


@router.post("/import/seed", response_model=schemas.BulkImportResult,
             dependencies=[Depends(verify_admin)])
def import_seed(db: Session = Depends(get_db)):
    """Load the bundled Colorado seed data into the database."""
    seed_path = os.path.join(os.path.dirname(__file__), "..", "seed_data", "colorado_seed.json")
    with open(seed_path, "r") as f:
        data = json.load(f)
    return _process_import(data, db)


def _process_import(data: dict, db: Session) -> schemas.BulkImportResult:
    result = schemas.BulkImportResult()

    state_code = data.get("state_code", "").upper()
    state = db.query(models.State).filter(models.State.code == state_code).first()
    if not state:
        result.errors.append(f"State '{state_code}' not found. Create it first via POST /api/admin/states")
        return result

    for hunt_data in data.get("hunts", []):
        draw_results_data = hunt_data.pop("draw_results", [])

        # Upsert hunt
        hunt = (
            db.query(models.Hunt)
            .filter(
                models.Hunt.state_id == state.id,
                models.Hunt.hunt_code == hunt_data["hunt_code"],
            )
            .first()
        )
        if hunt:
            for k, v in hunt_data.items():
                setattr(hunt, k, v)
            result.hunts_updated += 1
        else:
            hunt = models.Hunt(state_id=state.id, **hunt_data)
            db.add(hunt)
            db.flush()
            result.hunts_created += 1

        for dr_data in draw_results_data:
            buckets_data = dr_data.pop("point_buckets", [])
            app_type = dr_data.get("applicant_type", "resident")
            year = dr_data.get("year")

            # Upsert draw result
            dr = (
                db.query(models.DrawResult)
                .filter(
                    models.DrawResult.hunt_id == hunt.id,
                    models.DrawResult.year == year,
                    models.DrawResult.applicant_type == app_type,
                )
                .first()
            )
            if dr:
                for k, v in dr_data.items():
                    setattr(dr, k, v)
                # Remove old buckets
                db.query(models.PointBucketResult).filter(
                    models.PointBucketResult.draw_result_id == dr.id
                ).delete()
            else:
                dr = models.DrawResult(hunt_id=hunt.id, **dr_data)
                db.add(dr)
                db.flush()
                result.draw_results_created += 1

            for b in buckets_data:
                applicants = b.get("applicants", 0)
                successful = b.get("successful", 0)
                odds = round(successful / applicants, 4) if applicants > 0 else None
                bucket = models.PointBucketResult(
                    draw_result_id=dr.id,
                    points=b["points"],
                    applicants=applicants,
                    successful=successful,
                    odds=odds,
                )
                db.add(bucket)

    db.commit()
    return result
