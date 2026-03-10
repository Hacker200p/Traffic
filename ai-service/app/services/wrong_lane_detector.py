"""Wrong-lane / wrong-way driving detection service.

Detects vehicles driving in a prohibited lane or against the flow of
traffic by checking whether a vehicle's centroid falls within a defined
boundary and whether it is moving in the wrong direction.
"""

from __future__ import annotations

import time
from typing import Optional

import numpy as np

from app.config.settings import get_settings
from app.models.schemas import (
    BoundingBox,
    WrongLaneViolation,
    WrongLaneDetectionResult,
)
from app.services.vehicle_detector import vehicle_detector
from app.utils.logger import logger
from app.utils.exceptions import DetectionError
from app.utils.image_utils import generate_frame_id


class WrongLaneDetector:
    """Detects vehicles driving in a wrong lane or wrong direction.

    **Boundary mode** (``lane_boundaries`` provided):
        The caller defines forbidden zones. Any vehicle whose centroid
        falls inside a forbidden zone is flagged.

    **Direction mode** (``expected_direction`` + two frames):
        Compares actual heading of tracked vehicles against the expected
        flow direction.  Vehicles moving opposite to the flow are flagged.
    """

    def detect(
        self,
        image: np.ndarray,
        *,
        lane_boundaries: Optional[list[dict]] = None,
        expected_direction: Optional[str] = None,
        prev_frame: Optional[np.ndarray] = None,
        fps: float = 30.0,
        signal_id: Optional[str] = None,
        confidence: Optional[float] = None,
    ) -> WrongLaneDetectionResult:
        """Analyse a frame for wrong-lane violations.

        Parameters
        ----------
        image : np.ndarray
            Current BGR frame.
        lane_boundaries : list[dict], optional
            Forbidden zones as ``[{"x1": …, "y1": …, "x2": …, "y2": …}]``.
        expected_direction : str, optional
            Expected traffic flow: ``"up"``, ``"down"``, ``"left"``, ``"right"``.
        prev_frame : np.ndarray, optional
            Previous frame for direction estimation.
        fps : float
            Camera FPS (unused currently, reserved for future use).
        signal_id : str, optional
            Related traffic signal.
        confidence : float, optional
            Override detection confidence.
        """
        settings = get_settings()
        conf = confidence or settings.vehicle_confidence
        frame_id = generate_frame_id()
        start = time.perf_counter()

        try:
            violations: list[WrongLaneViolation] = []

            if lane_boundaries:
                violations = self._check_boundaries(image, lane_boundaries, conf)
            elif expected_direction and prev_frame is not None:
                violations = self._check_direction(
                    prev_frame, image, expected_direction, conf
                )
            else:
                det = vehicle_detector.detect(image, confidence=conf)
                logger.debug(
                    f"Wrong-lane check: {det.total_count} vehicles detected, "
                    "but no lane boundaries or direction info provided"
                )

            elapsed = (time.perf_counter() - start) * 1000
            logger.debug(
                f"Wrong-lane detection: {len(violations)} violations in {elapsed:.1f}ms",
                frame_id=frame_id,
            )

            return WrongLaneDetectionResult(
                frame_id=frame_id,
                signal_id=signal_id,
                violations=violations,
                total_violations=len(violations),
                processing_time_ms=round(elapsed, 2),
            )

        except DetectionError:
            raise
        except Exception as exc:
            raise DetectionError("wrong_lane_detector", str(exc)) from exc

    # ── boundary-based ──────────────────────────────────────
    def _check_boundaries(
        self,
        image: np.ndarray,
        boundaries: list[dict],
        conf: float,
    ) -> list[WrongLaneViolation]:
        det = vehicle_detector.detect(image, confidence=conf)
        violations: list[WrongLaneViolation] = []

        for v in det.vehicles:
            cx = (v.bbox.x1 + v.bbox.x2) / 2
            cy = (v.bbox.y1 + v.bbox.y2) / 2

            for zone in boundaries:
                zx1 = float(zone.get("x1", 0))
                zy1 = float(zone.get("y1", 0))
                zx2 = float(zone.get("x2", 0))
                zy2 = float(zone.get("y2", 0))

                if zx1 <= cx <= zx2 and zy1 <= cy <= zy2:
                    violations.append(
                        WrongLaneViolation(
                            vehicle_bbox=v.bbox,
                            vehicle_type=v.vehicle_type,
                            reason="Vehicle in forbidden zone",
                        )
                    )
                    break

        return violations

    # ── direction-based ─────────────────────────────────────
    def _check_direction(
        self,
        prev_frame: np.ndarray,
        curr_frame: np.ndarray,
        expected_direction: str,
        conf: float,
    ) -> list[WrongLaneViolation]:
        prev_det = vehicle_detector.detect(prev_frame, confidence=conf)
        curr_det = vehicle_detector.detect(curr_frame, confidence=conf)

        prev_centroids = {
            v.track_id: ((v.bbox.x1 + v.bbox.x2) / 2, (v.bbox.y1 + v.bbox.y2) / 2, v)
            for v in prev_det.vehicles
            if v.track_id is not None
        }

        direction_map = {
            "up": (0, -1),
            "down": (0, 1),
            "left": (-1, 0),
            "right": (1, 0),
        }
        expected = direction_map.get(expected_direction.lower(), (0, -1))

        violations: list[WrongLaneViolation] = []
        for v in curr_det.vehicles:
            if v.track_id is None or v.track_id not in prev_centroids:
                continue

            px, py, _ = prev_centroids[v.track_id]
            cx = (v.bbox.x1 + v.bbox.x2) / 2
            cy = (v.bbox.y1 + v.bbox.y2) / 2

            dx, dy = cx - px, cy - py
            # Dot product with expected direction — negative means opposite
            dot = dx * expected[0] + dy * expected[1]
            magnitude = (dx ** 2 + dy ** 2) ** 0.5

            # Only flag if vehicle is moving meaningfully (>2px) in the wrong direction
            if magnitude > 2.0 and dot < 0:
                violations.append(
                    WrongLaneViolation(
                        vehicle_bbox=v.bbox,
                        vehicle_type=v.vehicle_type,
                        reason=f"Vehicle moving opposite to expected '{expected_direction}' flow",
                    )
                )

        return violations


wrong_lane_detector = WrongLaneDetector()
