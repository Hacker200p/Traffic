"""Accident detection endpoints — analyse GPS telemetry for accidents."""

from __future__ import annotations

import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.accident_detector import accident_detector
from app.services import backend_client
from app.utils.logger import logger
from app.models.schemas import APIResponse


router = APIRouter(prefix="/accidents", tags=["Accident Detection"])


# ── Request / response schemas ───────────────────────────────────────

class GPSPoint(BaseModel):
    vehicle_id: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    speed: float = Field(default=0, ge=0)
    heading: Optional[float] = Field(default=None, ge=0, le=360)
    timestamp: str


class TelemetryRequest(BaseModel):
    vehicle_id: str
    points: list[GPSPoint] = Field(..., min_length=2, max_length=100)
    camera_id: Optional[str] = None
    auto_report: bool = Field(default=True, description="Auto-report to backend if accident detected")


class CollisionRequest(BaseModel):
    points_a: list[GPSPoint] = Field(..., min_length=1, max_length=100)
    points_b: list[GPSPoint] = Field(..., min_length=1, max_length=100)
    auto_report: bool = True


# ── Endpoints ────────────────────────────────────────────────────────

@router.post(
    "/analyse-telemetry",
    response_model=APIResponse,
    summary="Analyse vehicle telemetry for accident patterns",
)
async def analyse_telemetry(req: TelemetryRequest):
    """
    Accepts a sequence of GPS points for a single vehicle and checks for:
    - Sudden stop (speed drop from >30 km/h to <5 km/h within 3s)
    - Unusual motion (erratic heading changes >120° while moving)
    """
    try:
        points = [p.model_dump() for p in req.points]
        result = accident_detector.analyse_telemetry(req.vehicle_id, points)

        # Auto-report accident to backend
        if result.get("detected") and req.auto_report:
            asyncio.create_task(
                _push_accident_to_backend(result, [req.vehicle_id])
            )

        return APIResponse(
            success=True,
            data=result,
            processing_time_ms=result.get("processing_time_ms", 0),
        )
    except Exception as exc:
        logger.exception("Telemetry analysis failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post(
    "/detect-collision",
    response_model=APIResponse,
    summary="Detect collision between two vehicle tracks",
)
async def detect_collision(req: CollisionRequest):
    """
    Compares two vehicles' GPS tracks and checks if they were at the same
    location (within 5m) at the same time (within 2s) — indicating a collision.
    """
    try:
        pts_a = [p.model_dump() for p in req.points_a]
        pts_b = [p.model_dump() for p in req.points_b]
        result = accident_detector.detect_collision(pts_a, pts_b)

        if result.get("detected") and req.auto_report:
            vehicle_ids = []
            data = result.get("data", {})
            if data.get("vehicle_a", {}).get("vehicle_id"):
                vehicle_ids.append(data["vehicle_a"]["vehicle_id"])
            if data.get("vehicle_b", {}).get("vehicle_id"):
                vehicle_ids.append(data["vehicle_b"]["vehicle_id"])
            asyncio.create_task(
                _push_accident_to_backend(result, vehicle_ids)
            )

        return APIResponse(
            success=True,
            data=result,
            processing_time_ms=result.get("processing_time_ms", 0),
        )
    except Exception as exc:
        logger.exception("Collision detection failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Background push to backend ───────────────────────────────────────

async def _push_accident_to_backend(
    detection: dict,
    vehicle_ids: list[str],
) -> None:
    """Fire-and-forget: create an alert in the Node.js backend."""
    try:
        data = detection.get("data", {})
        location = data.get("location", {})

        await backend_client.post_alert({
            "type": "accident",
            "priority": detection.get("severity", "high"),
            "title": f"Accident detected: {detection.get('type', 'unknown').replace('_', ' ')}",
            "description": (
                f"Automatic accident detection ({detection['type']}). "
                f"Vehicle IDs: {', '.join(vehicle_ids) if vehicle_ids else 'unknown'}"
            ),
            "latitude": location.get("latitude", 0),
            "longitude": location.get("longitude", 0),
            "vehicle_id": vehicle_ids[0] if vehicle_ids else None,
        })
        logger.info(
            "Accident alert pushed to backend",
            extra={"type": detection["type"], "vehicles": vehicle_ids},
        )
    except Exception as exc:
        logger.error(f"Failed to push accident alert to backend: {exc}")
