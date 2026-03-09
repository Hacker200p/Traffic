"""Traffic density analysis service."""

from __future__ import annotations

import time
from typing import Optional

import numpy as np

from app.config.settings import get_settings
from app.models.schemas import DensityLevel, DensityResult
from app.services.vehicle_detector import vehicle_detector
from app.utils.logger import logger
from app.utils.exceptions import DetectionError
from app.utils.image_utils import generate_frame_id


class DensityAnalyzer:
    """Computes traffic density from a vehicle-detection pass."""

    def analyze(
        self,
        image: np.ndarray,
        lane_count: int = 2,
        confidence: Optional[float] = None,
    ) -> DensityResult:
        """Detect vehicles then classify traffic density.

        Returns a ``DensityResult`` with level and suggested signal timing.
        """
        settings = get_settings()
        frame_id = generate_frame_id()
        start = time.perf_counter()

        try:
            # Re-use vehicle detector for counting
            det = vehicle_detector.detect(image, confidence=confidence)
            count = det.total_count
            h, w = image.shape[:2]

            # Estimate occupancy: ratio of total bbox area to image area
            total_box_area = 0.0
            for v in det.vehicles:
                bw = v.bbox.x2 - v.bbox.x1
                bh = v.bbox.y2 - v.bbox.y1
                total_box_area += bw * bh
            image_area = float(w * h) or 1.0
            occupancy = min(total_box_area / image_area, 1.0)

            # Classify density level
            level = self._classify(count, settings)

            # Simple green-time suggestion
            suggested_green = self._suggest_green(count, level)

            # Per-lane estimate (uniform distribution assumption)
            per_lane: dict[str, int] = {}
            if lane_count > 0:
                base = count // lane_count
                remainder = count % lane_count
                for i in range(lane_count):
                    per_lane[f"lane_{i+1}"] = base + (1 if i < remainder else 0)

            elapsed = (time.perf_counter() - start) * 1000
            logger.debug(
                f"Density analysis: {count} vehicles → {level.value} "
                f"(occupancy {occupancy:.2%}) in {elapsed:.1f}ms",
                frame_id=frame_id,
            )

            return DensityResult(
                frame_id=frame_id,
                vehicle_count=count,
                density_level=level,
                occupancy_ratio=round(occupancy, 4),
                vehicles_per_lane=per_lane,
                suggested_green_duration=suggested_green,
                processing_time_ms=round(elapsed, 2),
            )

        except DetectionError:
            raise
        except Exception as exc:
            raise DetectionError("density_analyzer", str(exc)) from exc

    # ── helpers ─────────────────────────────────────────────

    @staticmethod
    def _classify(count: int, settings: Settings | None = None) -> DensityLevel:
        s = settings or get_settings()
        if count <= s.density_low_threshold:
            return DensityLevel.LOW
        if count <= s.density_medium_threshold:
            return DensityLevel.MEDIUM
        if count <= s.density_high_threshold:
            return DensityLevel.HIGH
        return DensityLevel.CRITICAL

    @staticmethod
    def _suggest_green(count: int, level: DensityLevel) -> int:
        """Return a suggested green-light duration in seconds."""
        mapping = {
            DensityLevel.LOW: 20,
            DensityLevel.MEDIUM: 35,
            DensityLevel.HIGH: 50,
            DensityLevel.CRITICAL: 60,
        }
        return mapping.get(level, 30)


# Module-level instance
density_analyzer = DensityAnalyzer()
