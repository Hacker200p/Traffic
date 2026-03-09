"""Vehicle detection service using YOLOv8."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

import numpy as np
from ultralytics import YOLO

from app.config.settings import get_settings
from app.models.schemas import (
    BoundingBox,
    DetectedVehicle,
    VehicleDetectionResult,
    VehicleType,
)
from app.utils.logger import logger
from app.utils.exceptions import ModelLoadError, DetectionError
from app.utils.image_utils import generate_frame_id

# COCO class-id → VehicleType mapping
_COCO_VEHICLE_MAP: dict[int, VehicleType] = {
    2: VehicleType.CAR,        # car
    3: VehicleType.MOTORCYCLE,  # motorcycle
    5: VehicleType.BUS,        # bus
    7: VehicleType.TRUCK,      # truck
    1: VehicleType.BICYCLE,    # bicycle
}

_VEHICLE_CLASS_IDS: list[int] = list(_COCO_VEHICLE_MAP.keys())


class VehicleDetector:
    """Singleton-style vehicle detection service."""

    def __init__(self) -> None:
        self._model: Optional[YOLO] = None
        self._loaded = False

    # ── lifecycle ───────────────────────────────────────────
    def load_model(self) -> None:
        settings = get_settings()
        model_path = Path(settings.yolo_vehicle_model)
        try:
            logger.info(f"Loading vehicle detection model: {model_path}")
            self._model = YOLO(str(model_path))
            self._loaded = True
            logger.info("Vehicle detection model loaded successfully")
        except Exception as exc:
            self._loaded = False
            raise ModelLoadError("vehicle_detector", str(exc)) from exc

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    # ── inference ───────────────────────────────────────────
    def detect(self, image: np.ndarray, confidence: Optional[float] = None) -> VehicleDetectionResult:
        """Run vehicle detection on a single BGR image.

        Returns a ``VehicleDetectionResult`` with all detected vehicles.
        """
        if not self._loaded or self._model is None:
            raise DetectionError("vehicle_detector", "Model not loaded")

        settings = get_settings()
        conf = confidence or settings.vehicle_confidence
        h, w = image.shape[:2]
        frame_id = generate_frame_id()
        start = time.perf_counter()

        try:
            results = self._model.predict(
                source=image,
                conf=conf,
                classes=_VEHICLE_CLASS_IDS,
                verbose=False,
            )

            vehicles: list[DetectedVehicle] = []
            for result in results:
                for box in result.boxes:
                    cls_id = int(box.cls[0])
                    vtype = _COCO_VEHICLE_MAP.get(cls_id, VehicleType.UNKNOWN)
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf_score = float(box.conf[0])
                    track_id = int(box.id[0]) if box.id is not None else None

                    vehicles.append(
                        DetectedVehicle(
                            vehicle_type=vtype,
                            bbox=BoundingBox(
                                x1=x1, y1=y1, x2=x2, y2=y2,
                                confidence=conf_score,
                                label=vtype.value,
                            ),
                            track_id=track_id,
                        )
                    )

            elapsed = (time.perf_counter() - start) * 1000
            logger.debug(
                f"Vehicle detection complete: {len(vehicles)} vehicles in {elapsed:.1f}ms",
                frame_id=frame_id,
            )

            return VehicleDetectionResult(
                frame_id=frame_id,
                image_width=w,
                image_height=h,
                vehicles=vehicles,
                total_count=len(vehicles),
                processing_time_ms=round(elapsed, 2),
            )

        except DetectionError:
            raise
        except Exception as exc:
            raise DetectionError("vehicle_detector", str(exc)) from exc


# Module-level instance
vehicle_detector = VehicleDetector()
