"""Number-plate recognition service (YOLOv8 + EasyOCR)."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

import numpy as np
import easyocr
from ultralytics import YOLO

from app.config.settings import get_settings
from app.models.schemas import BoundingBox, PlateReading, PlateRecognitionResult
from app.utils.logger import logger
from app.utils.exceptions import ModelLoadError, DetectionError
from app.utils.image_utils import crop_region, bgr_to_rgb, generate_frame_id

# COCO class-id 0 is "person"; there is no native plate class.
# When a custom plate-detection model is used, class 0 = "plate".
_PLATE_CLS = 0


class PlateReader:
    """Detect licence plates (YOLO) then read text (EasyOCR)."""

    def __init__(self) -> None:
        self._yolo: Optional[YOLO] = None
        self._ocr: Optional[easyocr.Reader] = None
        self._loaded = False
        self._is_custom = False

    # ── lifecycle ───────────────────────────────────────────
    def load_model(self) -> None:
        settings = get_settings()
        model_path = Path(settings.yolo_plate_model)

        try:
            logger.info(f"Loading plate detection model: {model_path}")
            self._yolo = YOLO(str(model_path))

            names: dict = getattr(self._yolo, "names", {}) or {}
            lower = [str(v).lower() for v in names.values()]
            self._is_custom = any(n in lower for n in ("plate", "license_plate", "number_plate"))

            logger.info(f"Loading EasyOCR reader (languages={settings.ocr_lang_list}, gpu={settings.ocr_gpu})")
            self._ocr = easyocr.Reader(
                settings.ocr_lang_list,
                gpu=settings.ocr_gpu,
                verbose=False,
            )

            self._loaded = True
            logger.info("Plate reader loaded successfully")
        except Exception as exc:
            self._loaded = False
            raise ModelLoadError("plate_reader", str(exc)) from exc

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    # ── inference ───────────────────────────────────────────
    def recognize(self, image: np.ndarray, confidence: Optional[float] = None) -> PlateRecognitionResult:
        """Detect plates then run OCR on each crop.

        Falls back to full-image OCR when using a generic (non-plate) YOLO model.
        """
        if not self._loaded or self._yolo is None or self._ocr is None:
            raise DetectionError("plate_reader", "Model not loaded")

        settings = get_settings()
        conf = confidence or settings.plate_confidence
        frame_id = generate_frame_id()
        start = time.perf_counter()

        try:
            plates: list[PlateReading] = []

            if self._is_custom:
                plates = self._detect_with_yolo(image, conf)
            else:
                # No custom plate YOLO → run OCR directly on the full image
                plates = self._ocr_full_image(image)

            elapsed = (time.perf_counter() - start) * 1000
            logger.debug(
                f"Plate recognition: {len(plates)} plates in {elapsed:.1f}ms",
                frame_id=frame_id,
            )

            return PlateRecognitionResult(
                frame_id=frame_id,
                plates=plates,
                total_detected=len(plates),
                processing_time_ms=round(elapsed, 2),
            )

        except DetectionError:
            raise
        except Exception as exc:
            raise DetectionError("plate_reader", str(exc)) from exc

    # ── internal strategies ─────────────────────────────────
    def _detect_with_yolo(self, image: np.ndarray, conf: float) -> list[PlateReading]:
        """Use the custom YOLO plate model then OCR each crop."""
        results = self._yolo.predict(source=image, conf=conf, verbose=False)  # type: ignore[union-attr]
        plates: list[PlateReading] = []

        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = [int(c) for c in box.xyxy[0].tolist()]
                score = float(box.conf[0])
                crop = crop_region(image, x1, y1, x2, y2)
                text, ocr_conf = self._ocr_crop(crop)

                if text:
                    plates.append(
                        PlateReading(
                            bbox=BoundingBox(
                                x1=float(x1), y1=float(y1),
                                x2=float(x2), y2=float(y2),
                                confidence=score,
                                label="plate",
                            ),
                            plate_text=text,
                            ocr_confidence=ocr_conf,
                        )
                    )

        return plates

    def _ocr_full_image(self, image: np.ndarray) -> list[PlateReading]:
        """Fallback: run EasyOCR on the whole image."""
        rgb = bgr_to_rgb(image)
        ocr_results = self._ocr.readtext(rgb, detail=1)  # type: ignore[union-attr]
        plates: list[PlateReading] = []

        for bbox_pts, text, score in ocr_results:
            cleaned = self._clean_plate_text(text)
            if not cleaned or len(cleaned) < 3:
                continue

            # bbox_pts is 4-corner polygon → convert to x1y1x2y2
            xs = [p[0] for p in bbox_pts]
            ys = [p[1] for p in bbox_pts]

            plates.append(
                PlateReading(
                    bbox=BoundingBox(
                        x1=min(xs), y1=min(ys),
                        x2=max(xs), y2=max(ys),
                        confidence=score,
                        label="plate_ocr",
                    ),
                    plate_text=cleaned,
                    ocr_confidence=score,
                )
            )

        return plates

    def _ocr_crop(self, crop: np.ndarray) -> tuple[str, float]:
        """Run EasyOCR on a small image crop and return (text, confidence)."""
        rgb = bgr_to_rgb(crop)
        ocr_results = self._ocr.readtext(rgb, detail=1)  # type: ignore[union-attr]

        if not ocr_results:
            return "", 0.0

        # Concatenate all text fragments in reading order
        texts: list[str] = []
        scores: list[float] = []
        for _, text, score in ocr_results:
            cleaned = self._clean_plate_text(text)
            if cleaned:
                texts.append(cleaned)
                scores.append(score)

        combined = " ".join(texts).strip()
        avg_conf = sum(scores) / len(scores) if scores else 0.0
        return combined, round(avg_conf, 4)

    @staticmethod
    def _clean_plate_text(text: str) -> str:
        """Remove noise characters from OCR output."""
        allowed = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ")
        return "".join(ch for ch in text.upper() if ch in allowed).strip()


# Module-level instance
plate_reader = PlateReader()
