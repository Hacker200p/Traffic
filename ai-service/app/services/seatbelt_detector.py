"""Seatbelt detection service for vehicle occupants.

Uses a YOLO model to detect whether vehicle occupants are wearing seatbelts.
When a custom seatbelt model is not available, falls back to detecting persons
inside vehicle bounding boxes as a proxy (violations flagged for human review).
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

import numpy as np
from ultralytics import YOLO

from app.config.settings import get_settings
from app.models.schemas import BoundingBox, SeatbeltDetection, SeatbeltDetectionResult
from app.utils.logger import logger
from app.utils.exceptions import ModelLoadError, DetectionError
from app.utils.image_utils import generate_frame_id

# Custom seatbelt model class ids (convention)
_SEATBELT_CLS = 0
_NO_SEATBELT_CLS = 1

# COCO fallback class ids
_PERSON_CLS_COCO = 0
_CAR_CLS_COCO = 2


class SeatbeltDetector:
    """Detects whether vehicle occupants are wearing seatbelts."""

    def __init__(self) -> None:
        self._model: Optional[YOLO] = None
        self._loaded = False
        self._is_custom_model = False

    def load_model(self) -> None:
        settings = get_settings()
        model_path = Path(settings.yolo_seatbelt_model)
        try:
            logger.info(f"Loading seatbelt detection model: {model_path}")
            self._model = YOLO(str(model_path))

            names: dict = getattr(self._model, "names", {}) or {}
            lower_names = [str(v).lower() for v in names.values()]
            self._is_custom_model = any(
                n in lower_names for n in ("seatbelt", "no_seatbelt", "no seatbelt")
            )

            self._loaded = True
            logger.info(
                f"Seatbelt model loaded (custom={self._is_custom_model}, "
                f"classes={list(names.values())})"
            )
        except Exception as exc:
            self._loaded = False
            raise ModelLoadError("seatbelt_detector", str(exc)) from exc

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def detect(
        self, image: np.ndarray, confidence: Optional[float] = None
    ) -> SeatbeltDetectionResult:
        if not self._loaded or self._model is None:
            raise DetectionError("seatbelt_detector", "Model not loaded")

        settings = get_settings()
        conf = confidence or settings.seatbelt_confidence
        frame_id = generate_frame_id()
        start = time.perf_counter()

        try:
            results = self._model.predict(source=image, conf=conf, verbose=False)

            detections: list[SeatbeltDetection] = []

            if self._is_custom_model:
                detections = self._process_custom(results)
            else:
                detections = self._process_coco_fallback(results)

            without = sum(1 for d in detections if not d.has_seatbelt)
            elapsed = (time.perf_counter() - start) * 1000

            logger.debug(
                f"Seatbelt detection: {len(detections)} occupants, "
                f"{without} without seatbelt in {elapsed:.1f}ms",
                frame_id=frame_id,
            )

            return SeatbeltDetectionResult(
                frame_id=frame_id,
                detections=detections,
                total_occupants=len(detections),
                without_seatbelt=without,
                processing_time_ms=round(elapsed, 2),
            )
        except DetectionError:
            raise
        except Exception as exc:
            raise DetectionError("seatbelt_detector", str(exc)) from exc

    def _process_custom(self, results) -> list[SeatbeltDetection]:
        detections: list[SeatbeltDetection] = []
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                score = float(box.conf[0])

                if cls_id in (_SEATBELT_CLS, _NO_SEATBELT_CLS):
                    detections.append(
                        SeatbeltDetection(
                            bbox=BoundingBox(
                                x1=x1, y1=y1, x2=x2, y2=y2,
                                confidence=score,
                                label="seatbelt" if cls_id == _SEATBELT_CLS else "no_seatbelt",
                            ),
                            has_seatbelt=(cls_id == _SEATBELT_CLS),
                        )
                    )
        return detections

    def _process_coco_fallback(self, results) -> list[SeatbeltDetection]:
        """Fallback: detect persons inside car bounding boxes.

        Without a custom model we cannot truly determine seatbelt usage,
        so every person found inside a vehicle bbox is flagged as
        ``has_seatbelt=False`` for human review.
        """
        car_boxes: list[tuple[float, float, float, float]] = []
        person_boxes: list[tuple[float, float, float, float, float]] = []

        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                score = float(box.conf[0])
                if cls_id == _CAR_CLS_COCO:
                    car_boxes.append((x1, y1, x2, y2))
                elif cls_id == _PERSON_CLS_COCO:
                    person_boxes.append((x1, y1, x2, y2, score))

        detections: list[SeatbeltDetection] = []
        for px1, py1, px2, py2, pscore in person_boxes:
            pcx, pcy = (px1 + px2) / 2, (py1 + py2) / 2
            for cx1, cy1, cx2, cy2 in car_boxes:
                if cx1 <= pcx <= cx2 and cy1 <= pcy <= cy2:
                    detections.append(
                        SeatbeltDetection(
                            bbox=BoundingBox(
                                x1=px1, y1=py1, x2=px2, y2=py2,
                                confidence=pscore,
                                label="no_seatbelt",
                            ),
                            has_seatbelt=False,
                        )
                    )
                    break

        return detections


seatbelt_detector = SeatbeltDetector()
