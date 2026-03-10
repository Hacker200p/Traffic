"""Speed violation detection service.

Estimates vehicle speed by tracking positions across consecutive frames
and comparing against a configured speed limit.  When only a single frame
is available, the caller may supply an externally measured ``speed`` value
(e.g. from a radar sensor or GPS tracking feed) and this service will
compare it against the limit for the zone.
"""

from __future__ import annotations

import time
from typing import Optional

import numpy as np

from app.config.settings import get_settings
from app.models.schemas import (
    BoundingBox,
    SpeedViolation,
    SpeedDetectionResult,
    VehicleType,
)
from app.services.vehicle_detector import vehicle_detector
from app.utils.logger import logger
from app.utils.exceptions import DetectionError
from app.utils.image_utils import generate_frame_id


class SpeedDetector:
    """Detects overspeeding vehicles.

    **Primary mode** (``measured_speeds`` provided):
        The caller supplies pre-measured speeds for detected vehicles
        (e.g. from radar or multi-frame tracking). The detector simply
        checks each speed against the zone limit.

    **Estimation mode** (two consecutive frames):
        When ``prev_frame`` and ``fps`` / ``pixels_per_meter`` are given,
        the detector estimates speed from bounding-box displacement between
        frames.  This is less accurate but works with a single camera.
    """

    def detect(
        self,
        image: np.ndarray,
        speed_limit: float,
        *,
        measured_speeds: Optional[list[dict]] = None,
        prev_frame: Optional[np.ndarray] = None,
        fps: float = 30.0,
        pixels_per_meter: float = 10.0,
        signal_id: Optional[str] = None,
        confidence: Optional[float] = None,
    ) -> SpeedDetectionResult:
        """Analyse a frame (or frame pair) for overspeeding vehicles.

        Parameters
        ----------
        image : np.ndarray
            Current BGR frame.
        speed_limit : float
            Maximum allowed speed in km/h for this zone.
        measured_speeds : list[dict], optional
            Pre-measured speeds: ``[{"bbox": [x1,y1,x2,y2], "speed": float, "vehicle_type": str}]``
        prev_frame : np.ndarray, optional
            Previous BGR frame (for estimation mode).
        fps : float
            Camera frame rate (used in estimation mode).
        pixels_per_meter : float
            Calibration constant (used in estimation mode).
        signal_id : str, optional
            Associated traffic signal.
        confidence : float, optional
            Override detection confidence.
        """
        settings = get_settings()
        conf = confidence or settings.vehicle_confidence
        frame_id = generate_frame_id()
        start = time.perf_counter()

        try:
            violations: list[SpeedViolation] = []

            if measured_speeds:
                violations = self._check_measured(measured_speeds, speed_limit)
            elif prev_frame is not None:
                violations = self._estimate_from_frames(
                    prev_frame, image, speed_limit, fps, pixels_per_meter, conf
                )
            else:
                # Single frame with no speed data — detect vehicles but
                # cannot determine speed without a second frame or sensor.
                det = vehicle_detector.detect(image, confidence=conf)
                logger.debug(
                    f"Speed check: {det.total_count} vehicles detected, "
                    "but no speed data or previous frame provided"
                )

            elapsed = (time.perf_counter() - start) * 1000

            logger.debug(
                f"Speed detection: {len(violations)} violations "
                f"(limit={speed_limit} km/h) in {elapsed:.1f}ms",
                frame_id=frame_id,
            )

            return SpeedDetectionResult(
                frame_id=frame_id,
                signal_id=signal_id,
                speed_limit=speed_limit,
                violations=violations,
                total_violations=len(violations),
                processing_time_ms=round(elapsed, 2),
            )

        except DetectionError:
            raise
        except Exception as exc:
            raise DetectionError("speed_detector", str(exc)) from exc

    # ── measured speeds ─────────────────────────────────────
    @staticmethod
    def _check_measured(
        entries: list[dict], speed_limit: float
    ) -> list[SpeedViolation]:
        violations: list[SpeedViolation] = []
        for entry in entries:
            speed = float(entry.get("speed", 0))
            if speed <= speed_limit:
                continue

            coords = entry.get("bbox", [0, 0, 0, 0])
            vtype_str = entry.get("vehicle_type", "unknown")
            try:
                vtype = VehicleType(vtype_str)
            except ValueError:
                vtype = VehicleType.UNKNOWN

            violations.append(
                SpeedViolation(
                    vehicle_bbox=BoundingBox(
                        x1=float(coords[0]),
                        y1=float(coords[1]),
                        x2=float(coords[2]),
                        y2=float(coords[3]),
                        confidence=float(entry.get("confidence", 0.9)),
                        label=vtype.value,
                    ),
                    vehicle_type=vtype,
                    speed=speed,
                    speed_limit=speed_limit,
                )
            )
        return violations

    # ── frame-pair estimation ───────────────────────────────
    def _estimate_from_frames(
        self,
        prev_frame: np.ndarray,
        curr_frame: np.ndarray,
        speed_limit: float,
        fps: float,
        pixels_per_meter: float,
        conf: float,
    ) -> list[SpeedViolation]:
        """Estimate speed by matching vehicle centroids across two frames."""
        prev_det = vehicle_detector.detect(prev_frame, confidence=conf)
        curr_det = vehicle_detector.detect(curr_frame, confidence=conf)

        prev_centroids = {
            v.track_id: ((v.bbox.x1 + v.bbox.x2) / 2, (v.bbox.y1 + v.bbox.y2) / 2, v)
            for v in prev_det.vehicles
            if v.track_id is not None
        }

        violations: list[SpeedViolation] = []
        for v in curr_det.vehicles:
            if v.track_id is None or v.track_id not in prev_centroids:
                continue

            px, py, _ = prev_centroids[v.track_id]
            cx = (v.bbox.x1 + v.bbox.x2) / 2
            cy = (v.bbox.y1 + v.bbox.y2) / 2

            pixel_dist = ((cx - px) ** 2 + (cy - py) ** 2) ** 0.5
            meter_dist = pixel_dist / pixels_per_meter
            time_delta = 1.0 / fps if fps > 0 else 1.0
            speed_ms = meter_dist / time_delta
            speed_kmh = speed_ms * 3.6

            if speed_kmh > speed_limit:
                violations.append(
                    SpeedViolation(
                        vehicle_bbox=v.bbox,
                        vehicle_type=v.vehicle_type,
                        speed=round(speed_kmh, 1),
                        speed_limit=speed_limit,
                    )
                )

        return violations


speed_detector = SpeedDetector()
