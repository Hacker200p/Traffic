"""Helmet detection service for motorcycle riders."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

import numpy as np
from ultralytics import YOLO

from app.config.settings import get_settings
from app.models.schemas import BoundingBox, HelmetDetection, HelmetDetectionResult
from app.utils.logger import logger
from app.utils.exceptions import ModelLoadError, DetectionError
from app.utils.image_utils import generate_frame_id

# If using a custom-trained helmet model the class mapping might differ.
# Default assumption for a custom YOLOv8 helmet model:
#   0 = helmet,  1 = no_helmet,  2 = rider
_HELMET_CLS = 0
_NO_HELMET_CLS = 1
_RIDER_CLS = 2

# Fallback: when using a generic COCO model, detect "person" (class 0)
# near motorcycles and assume no helmet label isn't available.
_PERSON_CLS_COCO = 0
_MOTORCYCLE_CLS_COCO = 3


class HelmetDetector:
    """Detects riders and whether they are wearing helmets."""

    def __init__(self) -> None:
        self._model: Optional[YOLO] = None
        self._loaded = False
        self._is_custom_model = False  # True when trained on helmet-specific dataset

    # ── lifecycle ───────────────────────────────────────────
    def load_model(self) -> None:
        settings = get_settings()
        model_path = Path(settings.yolo_helmet_model)
        try:
            logger.info(f"Loading helmet detection model: {model_path}")
            self._model = YOLO(str(model_path))

            # Inspect class names to decide if it's a custom helmet model
            names: dict = getattr(self._model, "names", {}) or {}
            lower_names = [str(v).lower() for v in names.values()]
            self._is_custom_model = any(n in lower_names for n in ("helmet", "no_helmet", "no helmet"))

            self._loaded = True
            logger.info(
                f"Helmet model loaded (custom={self._is_custom_model}, classes={list(names.values())})"
            )
        except Exception as exc:
            self._loaded = False
            raise ModelLoadError("helmet_detector", str(exc)) from exc

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    # ── inference ───────────────────────────────────────────
    def detect(self, image: np.ndarray, confidence: Optional[float] = None) -> HelmetDetectionResult:
        if not self._loaded or self._model is None:
            raise DetectionError("helmet_detector", "Model not loaded")

        settings = get_settings()
        conf = confidence or settings.helmet_confidence
        frame_id = generate_frame_id()
        start = time.perf_counter()

        try:
            results = self._model.predict(source=image, conf=conf, verbose=False)

            detections: list[HelmetDetection] = []

            if self._is_custom_model:
                detections = self._process_custom(results)
            else:
                detections = self._process_coco_fallback(results, image)

            without = sum(1 for d in detections if not d.has_helmet)
            elapsed = (time.perf_counter() - start) * 1000

            logger.debug(
                f"Helmet detection: {len(detections)} riders, "
                f"{without} without helmet in {elapsed:.1f}ms",
                frame_id=frame_id,
            )

            return HelmetDetectionResult(
                frame_id=frame_id,
                detections=detections,
                total_riders=len(detections),
                without_helmet=without,
                processing_time_ms=round(elapsed, 2),
            )

        except DetectionError:
            raise
        except Exception as exc:
            raise DetectionError("helmet_detector", str(exc)) from exc

    # ── custom model logic ──────────────────────────────────
    def _process_custom(self, results) -> list[HelmetDetection]:
        detections: list[HelmetDetection] = []
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                score = float(box.conf[0])

                if cls_id in (_HELMET_CLS, _NO_HELMET_CLS):
                    detections.append(
                        HelmetDetection(
                            bbox=BoundingBox(
                                x1=x1, y1=y1, x2=x2, y2=y2,
                                confidence=score,
                                label="helmet" if cls_id == _HELMET_CLS else "no_helmet",
                            ),
                            has_helmet=(cls_id == _HELMET_CLS),
                        )
                    )
        return detections

    # ── COCO fallback: detect persons near motorcycles ──────
    def _process_coco_fallback(self, results, image: np.ndarray) -> list[HelmetDetection]:
        persons: list[dict] = []
        motorcycles: list[dict] = []

        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                score = float(box.conf[0])
                entry = {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "conf": score}
                if cls_id == _PERSON_CLS_COCO:
                    persons.append(entry)
                elif cls_id == _MOTORCYCLE_CLS_COCO:
                    motorcycles.append(entry)

        detections: list[HelmetDetection] = []
        for p in persons:
            for m in motorcycles:
                if self._boxes_overlap(p, m):
                    detections.append(
                        HelmetDetection(
                            bbox=BoundingBox(
                                x1=p["x1"], y1=p["y1"], x2=p["x2"], y2=p["y2"],
                                confidence=p["conf"],
                                label="rider_no_helmet",
                            ),
                            has_helmet=False,  # conservative: unknown → flag
                            rider_bbox=BoundingBox(
                                x1=m["x1"], y1=m["y1"], x2=m["x2"], y2=m["y2"],
                                confidence=m["conf"],
                                label="motorcycle",
                            ),
                        )
                    )
                    break  # one person ↔ one motorcycle match

        return detections

    @staticmethod
    def _boxes_overlap(a: dict, b: dict, threshold: float = 0.2) -> bool:
        """Check if two boxes overlap by at least ``threshold`` IoU-ish ratio."""
        ix1 = max(a["x1"], b["x1"])
        iy1 = max(a["y1"], b["y1"])
        ix2 = min(a["x2"], b["x2"])
        iy2 = min(a["y2"], b["y2"])
        inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
        area_a = (a["x2"] - a["x1"]) * (a["y2"] - a["y1"])
        area_b = (b["x2"] - b["x1"]) * (b["y2"] - b["y1"])
        smaller = min(area_a, area_b) or 1.0
        return (inter / smaller) >= threshold


# Module-level instance
helmet_detector = HelmetDetector()
