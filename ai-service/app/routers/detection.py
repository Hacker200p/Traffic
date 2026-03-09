"""Vehicle & helmet detection + red-light violation endpoints."""

from __future__ import annotations

import asyncio
from typing import Optional

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query

from app.models.schemas import (
    VehicleDetectionResult,
    HelmetDetectionResult,
    RedLightResult,
    APIResponse,
)
from app.services import vehicle_detector, helmet_detector, red_light_detector, backend_client
from app.utils import decode_upload, logger
from app.utils.exceptions import AIServiceError

router = APIRouter(prefix="/detect", tags=["Detection"])


# ────────────────────────────────────────────────────────────
# Vehicle detection
# ────────────────────────────────────────────────────────────

@router.post("/vehicles", response_model=APIResponse, summary="Detect vehicles in an image")
async def detect_vehicles(
    file: UploadFile = File(..., description="Image file (JPEG/PNG)"),
    confidence: Optional[float] = Query(None, ge=0.0, le=1.0, description="Override confidence threshold"),
    camera_id: Optional[str] = Form(None),
):
    try:
        image_bytes = await file.read()
        image = await decode_upload(image_bytes)
        result: VehicleDetectionResult = vehicle_detector.detect(image, confidence=confidence)

        return APIResponse(
            success=True,
            data=result.model_dump(mode="json"),
            processing_time_ms=result.processing_time_ms,
        )
    except AIServiceError as exc:
        logger.error(f"Vehicle detection failed: {exc.message}")
        raise HTTPException(status_code=422, detail=exc.message)
    except Exception as exc:
        logger.exception("Unexpected error in /detect/vehicles")
        raise HTTPException(status_code=500, detail=str(exc))


# ────────────────────────────────────────────────────────────
# Helmet detection
# ────────────────────────────────────────────────────────────

@router.post("/helmets", response_model=APIResponse, summary="Detect helmet usage on riders")
async def detect_helmets(
    file: UploadFile = File(...),
    confidence: Optional[float] = Query(None, ge=0.0, le=1.0),
    camera_id: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    signal_id: Optional[str] = Form(None),
):
    try:
        image_bytes = await file.read()
        image = await decode_upload(image_bytes)
        result: HelmetDetectionResult = helmet_detector.detect(image, confidence=confidence)

        # Optionally push violations to backend
        if result.without_helmet > 0 and latitude is not None and longitude is not None:
            asyncio.create_task(
                _push_helmet_violations(result, latitude, longitude, signal_id)
            )

        return APIResponse(
            success=True,
            data=result.model_dump(mode="json"),
            processing_time_ms=result.processing_time_ms,
        )
    except AIServiceError as exc:
        logger.error(f"Helmet detection failed: {exc.message}")
        raise HTTPException(status_code=422, detail=exc.message)
    except Exception as exc:
        logger.exception("Unexpected error in /detect/helmets")
        raise HTTPException(status_code=500, detail=str(exc))


# ────────────────────────────────────────────────────────────
# Red-light violation detection
# ────────────────────────────────────────────────────────────

@router.post("/red-light", response_model=APIResponse, summary="Detect red-light violations")
async def detect_red_light(
    file: UploadFile = File(...),
    signal_state: str = Form("red", description="Current signal state"),
    stop_line_y: Optional[int] = Form(None, description="Stop-line Y-pixel"),
    signal_id: Optional[str] = Form(None),
    confidence: Optional[float] = Query(None, ge=0.0, le=1.0),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
):
    try:
        image_bytes = await file.read()
        image = await decode_upload(image_bytes)
        result: RedLightResult = red_light_detector.detect(
            image,
            signal_state=signal_state,
            stop_line_y=stop_line_y,
            signal_id=signal_id,
            confidence=confidence,
        )

        # Push violations to backend asynchronously
        if result.total_violations > 0 and latitude is not None and longitude is not None:
            asyncio.create_task(
                _push_red_light_violations(result, latitude, longitude, signal_id)
            )

        return APIResponse(
            success=True,
            data=result.model_dump(mode="json"),
            processing_time_ms=result.processing_time_ms,
        )
    except AIServiceError as exc:
        logger.error(f"Red-light detection failed: {exc.message}")
        raise HTTPException(status_code=422, detail=exc.message)
    except Exception as exc:
        logger.exception("Unexpected error in /detect/red-light")
        raise HTTPException(status_code=500, detail=str(exc))


# ────────────────────────────────────────────────────────────
# Async background pushes
# ────────────────────────────────────────────────────────────

async def _push_helmet_violations(
    result: HelmetDetectionResult,
    lat: float,
    lon: float,
    signal_id: Optional[str],
) -> None:
    for det in result.detections:
        if not det.has_helmet:
            try:
                await backend_client.post_violation({
                    "type": "no_helmet",
                    "description": f"Rider without helmet detected (conf={det.bbox.confidence:.2f})",
                    "latitude": lat,
                    "longitude": lon,
                    "signal_id": signal_id,
                    "severity": "medium",
                })
            except Exception as exc:
                logger.error(f"Failed to push helmet violation: {exc}")


async def _push_red_light_violations(
    result: RedLightResult,
    lat: float,
    lon: float,
    signal_id: Optional[str],
) -> None:
    for v in result.violations:
        try:
            await backend_client.post_violation({
                "type": "red_light",
                "description": (
                    f"Vehicle ({v.vehicle_type.value}) crossed stop line on red "
                    f"(conf={v.vehicle_bbox.confidence:.2f})"
                ),
                "latitude": lat,
                "longitude": lon,
                "signal_id": signal_id or result.signal_id,
                "severity": "high",
                "plate_text": v.plate_text,
            })
        except Exception as exc:
            logger.error(f"Failed to push red-light violation: {exc}")
