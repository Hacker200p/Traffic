"""Health-check and readiness endpoint."""

from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter

from app.models.schemas import HealthResponse
from app.services import (
    vehicle_detector,
    density_analyzer,
    helmet_detector,
    red_light_detector,
    plate_reader,
)

router = APIRouter(tags=["Health"])

_startup_time: float = time.time()


@router.get("/health", response_model=HealthResponse, summary="Service health check")
async def health_check():
    """Return model readiness and uptime information."""
    models_loaded = {
        "vehicle_detector": vehicle_detector.model is not None,
        "density_analyzer": density_analyzer.model is not None
        if hasattr(density_analyzer, "model")
        else vehicle_detector.model is not None,
        "helmet_detector": helmet_detector.model is not None,
        "red_light_detector": red_light_detector.model is not None
        if hasattr(red_light_detector, "model")
        else vehicle_detector.model is not None,
        "plate_reader_yolo": plate_reader.plate_model is not None
        if hasattr(plate_reader, "plate_model")
        else False,
        "plate_reader_ocr": plate_reader.reader is not None
        if hasattr(plate_reader, "reader")
        else False,
    }
    all_ready = all(models_loaded.values())
    uptime_seconds = round(time.time() - _startup_time, 2)

    return HealthResponse(
        status="healthy" if all_ready else "degraded",
        models_loaded=models_loaded,
        uptime_seconds=uptime_seconds,
        timestamp=datetime.now(timezone.utc),
    )
