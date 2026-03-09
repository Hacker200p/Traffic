"""Number-plate recognition endpoint."""

from __future__ import annotations

import asyncio
from typing import Optional

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query

from app.models.schemas import PlateRecognitionResult, APIResponse
from app.services import plate_reader, backend_client
from app.utils import decode_upload, logger
from app.utils.exceptions import AIServiceError

router = APIRouter(prefix="/plate", tags=["Plate Recognition"])


@router.post("/recognize", response_model=APIResponse, summary="Read number plates")
async def recognize_plates(
    file: UploadFile = File(..., description="Camera frame (JPEG/PNG)"),
    confidence: Optional[float] = Query(None, ge=0.0, le=1.0),
    camera_id: Optional[str] = Form(None),
    vehicle_id: Optional[str] = Form(None, description="Backend vehicle ID to link"),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
):
    """Detect and read number plates in a camera frame.

    If ``vehicle_id`` is provided the recognised plate text is sent
    to the backend tracking service.
    """
    try:
        image_bytes = await file.read()
        image = await decode_upload(image_bytes)
        result: PlateRecognitionResult = plate_reader.read(
            image,
            confidence=confidence,
        )

        # Optionally push to backend
        if vehicle_id and result.plates:
            asyncio.create_task(
                _push_plate_tracking(result, vehicle_id, latitude, longitude, camera_id)
            )

        return APIResponse(
            success=True,
            data=result.model_dump(mode="json"),
            processing_time_ms=result.processing_time_ms,
        )
    except AIServiceError as exc:
        logger.error(f"Plate recognition failed: {exc.message}")
        raise HTTPException(status_code=422, detail=exc.message)
    except Exception as exc:
        logger.exception("Unexpected error in /plate/recognize")
        raise HTTPException(status_code=500, detail=str(exc))


async def _push_plate_tracking(
    result: PlateRecognitionResult,
    vehicle_id: str,
    latitude: Optional[float],
    longitude: Optional[float],
    camera_id: Optional[str],
) -> None:
    """Forward plate readings to the backend tracking service."""
    try:
        for plate in result.plates:
            payload = {
                "vehicleId": vehicle_id,
                "plateNumber": plate.text,
                "confidence": plate.confidence,
                "cameraId": camera_id,
            }
            if latitude is not None and longitude is not None:
                payload["location"] = {"latitude": latitude, "longitude": longitude}

            await backend_client.post_tracking(payload)
            logger.info(f"Pushed plate '{plate.text}' for vehicle {vehicle_id}")
    except Exception as exc:
        logger.error(f"Failed to push plate tracking: {exc}")
