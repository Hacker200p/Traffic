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
    signal_id: Optional[str] = Form(None, description="Nearby signal ID for emergency priority"),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
):
    """Detect and read number plates in a camera frame.

    If ``vehicle_id`` is provided the recognised plate text is sent
    to the backend tracking service.

    When plates are detected, the system automatically checks if any
    belong to an emergency vehicle and, if so, overrides the nearby
    traffic signal to green.
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

        # Always record sightings for movement tracking when plates are detected
        if result.plates:
            asyncio.create_task(
                _push_sightings(result, camera_id, latitude, longitude)
            )

        # Always check for emergency vehicle priority when plates are detected
        if result.plates:
            asyncio.create_task(
                _check_emergency_priority(result, signal_id, camera_id, latitude, longitude)
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


async def _check_emergency_priority(
    result: PlateRecognitionResult,
    signal_id: Optional[str],
    camera_id: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
) -> None:
    """For each recognised plate, ask the backend if it belongs to an
    emergency vehicle. If so, the backend will override the traffic signal
    to green and broadcast an alert."""
    try:
        for plate in result.plates:
            payload: dict = {
                "plate_text": plate.plate_text,
            }
            if signal_id:
                payload["signal_id"] = signal_id
            if camera_id:
                payload["camera_id"] = camera_id
            if latitude is not None:
                payload["latitude"] = latitude
            if longitude is not None:
                payload["longitude"] = longitude

            resp = await backend_client.post_emergency_priority(payload)
            data = resp.get("data", {})
            if data and data.get("emergency"):
                logger.warning(
                    f"EMERGENCY VEHICLE DETECTED: plate='{plate.plate_text}' "
                    f"signal_override={data.get('signalOverride')}"
                )
    except Exception as exc:
        logger.error(f"Emergency priority check failed: {exc}")


async def _push_sightings(
    result: PlateRecognitionResult,
    camera_id: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
) -> None:
    """Record each recognised plate as a vehicle sighting for movement tracking."""
    try:
        for plate in result.plates:
            payload: dict = {
                "plate_text": plate.plate_text,
                "confidence": plate.confidence,
                "latitude": latitude or 0,
                "longitude": longitude or 0,
            }
            if camera_id:
                payload["camera_id"] = camera_id

            await backend_client.post_sighting(payload)
            logger.info(f"Sighting recorded for plate '{plate.plate_text}'")
    except Exception as exc:
        logger.error(f"Failed to push sighting: {exc}")
