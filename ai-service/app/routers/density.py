"""Traffic density analysis endpoint."""

from __future__ import annotations

import asyncio
from typing import Optional

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query

from app.models.schemas import DensityResult, APIResponse
from app.services import density_analyzer, backend_client
from app.utils import decode_upload, logger
from app.utils.exceptions import AIServiceError

router = APIRouter(prefix="/density", tags=["Density"])


@router.post("/analyze", response_model=APIResponse, summary="Analyze traffic density")
async def analyze_density(
    file: UploadFile = File(..., description="Camera frame (JPEG/PNG)"),
    lane_count: int = Form(2, ge=1, le=10, description="Number of lanes"),
    confidence: Optional[float] = Query(None, ge=0.0, le=1.0),
    signal_id: Optional[str] = Form(None, description="Associated traffic signal ID"),
    camera_id: Optional[str] = Form(None),
):
    """Analyse a single camera frame and return density metrics.

    If ``signal_id`` is provided the result (with a green-time suggestion) is
    also forwarded to the backend asynchronously.
    """
    try:
        image_bytes = await file.read()
        image = await decode_upload(image_bytes)
        result: DensityResult = density_analyzer.analyze(
            image,
            lane_count=lane_count,
            confidence=confidence,
        )

        # Fire-and-forget push to backend
        if signal_id:
            asyncio.create_task(
                _push_density_update(result, signal_id)
            )

        return APIResponse(
            success=True,
            data=result.model_dump(mode="json"),
            processing_time_ms=result.processing_time_ms,
        )
    except AIServiceError as exc:
        logger.error(f"Density analysis failed: {exc.message}")
        raise HTTPException(status_code=422, detail=exc.message)
    except Exception as exc:
        logger.exception("Unexpected error in /density/analyze")
        raise HTTPException(status_code=500, detail=str(exc))


async def _push_density_update(result: DensityResult, signal_id: str) -> None:
    """Send a signal-state suggestion to the backend when density is known."""
    try:
        if result.suggested_green_duration:
            await backend_client.post_signal_state(signal_id, {
                "state": "green",
                "duration": result.suggested_green_duration,
                "reason": (
                    f"AI density: {result.density_level.value} "
                    f"({result.vehicle_count} vehicles, "
                    f"occupancy {result.occupancy_ratio:.1%})"
                ),
            })
            logger.info(
                f"Suggested green={result.suggested_green_duration}s for signal {signal_id}"
            )
    except Exception as exc:
        logger.error(f"Failed to push density update: {exc}")
