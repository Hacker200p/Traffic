"""Route prediction endpoints — predict stolen vehicle trajectories."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.route_prediction import route_prediction_service
from app.utils.logger import logger
from app.models.schemas import APIResponse


router = APIRouter(prefix="/prediction", tags=["Route Prediction"])


# ── Request / response schemas ───────────────────────────────────────

class SightingPoint(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    speed: Optional[float] = Field(default=None, ge=0)
    heading: Optional[float] = Field(default=None, ge=0, le=360)
    timestamp: str


class IntersectionInput(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class PredictRouteRequest(BaseModel):
    sightings: list[SightingPoint] = Field(..., min_length=2, max_length=500)
    intersections: Optional[list[IntersectionInput]] = None


# ── Endpoints ────────────────────────────────────────────────────────

@router.post(
    "/route",
    response_model=APIResponse,
    summary="Predict likely route from sighting history",
)
async def predict_route(req: PredictRouteRequest):
    """
    Accepts a chronological list of GPS / camera sighting points and
    returns the predicted future trajectory with matched intersections.
    """
    try:
        sightings = [s.model_dump() for s in req.sightings]
        intersections = [ix.model_dump() for ix in req.intersections] if req.intersections else None

        result = route_prediction_service.predict_route(sightings, intersections)

        return APIResponse(
            success=True,
            data=result,
        )
    except Exception as exc:
        logger.exception("Route prediction failed")
        raise HTTPException(status_code=500, detail=str(exc))
