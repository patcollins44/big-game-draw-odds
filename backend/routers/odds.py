"""
Odds calculation engine.

Supports two draw systems:
  - preference  : Applicants are sorted descending by points. Tags awarded
                  top-down. In the cutoff bucket a random lottery occurs.
  - bonus       : Each point = +1 ticket in a weighted random draw.
  - random      : Pure lottery, points irrelevant.

The engine reads historical PointBucketResult rows and returns:
  - Estimated odds for the queried point count
  - Historical trend
  - Confidence level (based on years of data available)
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/odds", tags=["odds"])


def _calculate_odds_preference(point_buckets: list, points: int, tags: int) -> Optional[float]:
    """
    For a preference-point system, determine draw odds at a given point level.
    Logic: sort buckets high→low, accumulate applicants until tags run out.
    """
    if not point_buckets or tags is None:
        return None

    sorted_buckets = sorted(point_buckets, key=lambda b: b.points, reverse=True)

    remaining_tags = tags
    for bucket in sorted_buckets:
        if bucket.points > points:
            # Higher-point hunters draw first
            remaining_tags -= bucket.successful if bucket.successful else bucket.applicants
        elif bucket.points == points:
            # This is the applicant's bucket
            if remaining_tags <= 0:
                return 0.0
            if bucket.applicants <= 0:
                return None
            return min(1.0, remaining_tags / bucket.applicants)
        else:
            break  # Lower buckets don't affect this applicant

    # If we get here, no one with ≥ our points claimed all tags → 100% odds
    return 1.0


def _calculate_odds_bonus(point_buckets: list, points: int, tags: int) -> Optional[float]:
    """
    Bonus point (weighted lottery) odds calculation.
    Each applicant with N points gets N+1 tickets.
    Odds ≈ (points+1) / avg_tickets_per_applicant * (tags / total_applicants)
    """
    if not point_buckets or tags is None:
        return None

    total_tickets = sum(b.applicants * (b.points + 1) for b in point_buckets)
    total_applicants = sum(b.applicants for b in point_buckets)

    if total_tickets == 0 or total_applicants == 0:
        return None

    # Probability a single ticket wins (no replacement approximation)
    ticket_win_prob = tags / total_tickets
    my_tickets = points + 1
    # Probability of NOT winning with my_tickets draws
    odds = 1 - (1 - ticket_win_prob) ** my_tickets
    return min(1.0, odds)


def _calculate_odds_random(point_buckets: list, tags: int) -> Optional[float]:
    total = sum(b.applicants for b in point_buckets)
    if not total or tags is None:
        return None
    return min(1.0, tags / total)


def estimate_odds(draw_result: models.DrawResult, points: int, system: str) -> Optional[float]:
    buckets = draw_result.point_buckets
    tags = draw_result.tags_available

    if system == "preference":
        return _calculate_odds_preference(buckets, points, tags)
    elif system == "bonus":
        return _calculate_odds_bonus(buckets, points, tags)
    else:
        return _calculate_odds_random(buckets, tags)


@router.get("", response_model=schemas.OddsResult)
def get_odds(
    hunt_id: int = Query(...),
    points: int = Query(..., ge=0, le=99),
    applicant_type: str = Query("resident", pattern="^(resident|nonresident)$"),
    db: Session = Depends(get_db),
):
    hunt = (
        db.query(models.Hunt)
        .options(joinedload(models.Hunt.state))
        .filter(models.Hunt.id == hunt_id)
        .first()
    )
    if not hunt:
        raise HTTPException(404, "Hunt not found")

    system = hunt.state.points_system or "preference"

    draw_results = (
        db.query(models.DrawResult)
        .options(joinedload(models.DrawResult.point_buckets))
        .filter(
            models.DrawResult.hunt_id == hunt_id,
            models.DrawResult.applicant_type == applicant_type,
        )
        .order_by(models.DrawResult.year.desc())
        .all()
    )

    if not draw_results:
        raise HTTPException(404, "No draw data found for this hunt and applicant type")

    # Build history list
    history = []
    for dr in draw_results:
        odds_at_points = estimate_odds(dr, points, system)
        history.append({
            "year": dr.year,
            "odds": round(odds_at_points * 100, 1) if odds_at_points is not None else None,
            "min_points_drawn": dr.min_points_drawn,
            "tags_available": dr.tags_available,
            "total_applicants": dr.total_applicants,
        })

    # Use most recent year for the headline number
    latest = draw_results[0]
    latest_odds = estimate_odds(latest, points, system)

    # Confidence based on data availability
    years_of_data = len(draw_results)
    confidence = "high" if years_of_data >= 5 else ("medium" if years_of_data >= 3 else "low")

    return schemas.OddsResult(
        hunt_id=hunt.id,
        hunt_code=hunt.hunt_code,
        unit=hunt.unit,
        species=hunt.species,
        weapon_type=hunt.weapon_type,
        points=points,
        applicant_type=applicant_type,
        latest_year=latest.year,
        estimated_odds=round(latest_odds, 4) if latest_odds is not None else None,
        estimated_odds_pct=f"{latest_odds * 100:.1f}%" if latest_odds is not None else "N/A",
        min_points_to_draw=latest.min_points_drawn,
        history=history,
        confidence=confidence,
    )


@router.get("/compare")
def compare_odds(
    hunt_ids: str = Query(..., description="Comma-separated hunt IDs"),
    points: int = Query(..., ge=0, le=99),
    applicant_type: str = Query("resident"),
    db: Session = Depends(get_db),
):
    """Compare odds across multiple hunts for a given point count."""
    ids = [int(i.strip()) for i in hunt_ids.split(",") if i.strip().isdigit()]
    results = []
    for hunt_id in ids:
        try:
            result = get_odds(hunt_id=hunt_id, points=points,
                              applicant_type=applicant_type, db=db)
            results.append(result)
        except HTTPException:
            pass
    return sorted(results, key=lambda r: r.estimated_odds or 0, reverse=True)
