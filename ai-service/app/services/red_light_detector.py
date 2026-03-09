"""Red-light violation detection service.

Compares vehicle positions against a configurable stop-line to determine
if a vehicle has crossed during a red signal phase.
"""

from __future__ import annotations

import time
from typing import Optional

import cv2
import numpy as np

from app.config.settings import get_settings
from app.models.schemas import (
    BoundingBox,
    RedLightViolation,
    RedLightResult,
    VehicleType,
)
from app.services.vehicle_detector import vehicle_detector, _COCO_VEHICLE_MAP
from app.utils.logger import logger
from app.utils.exceptions import DetectionError
from app.utils.image_utils import generate_frame_id


class RedLightDetector:
    """Detects vehicles crossing a stop-line during a red signal.

    The stop-line is expressed as a horizontal Y coordinate: any vehicle
    whose bottom edge (**y2**) exceeds this line is considered having crossed.
    The caller must supply the signal state and the line position.
    """

    def detect(
        self,
        image: np.ndarray,
        signal_state: str = "red",
        stop_line_y: Optional[int] = None,
        signal_id: Optional[str] = None,
        confidence: Optional[float] = None,
    ) -> RedLightResult:
        """Analyse a single frame for red-light violations.

        Parameters
        ----------
        image : np.ndarray
            BGR frame from the camera.
        signal_state : str
            Current traffic-light state (``"red"`` triggers violation logic).
        stop_line_y : int, optional
            Y-pixel coordinate of the stop line. Defaults to 60 % of frame height.
        signal_id : str, optional
            ID of the associated traffic signal (forwarded to the backend).
        confidence : float, optional
            Override the default detection confidence.
        """
        settings = get_settings()
        conf = confidence or settings.red_light_confidence
        h, w = image.shape[:2]
        frame_id = generate_frame_id()
        start = time.perf_counter()

        if stop_line_y is None:
            stop_line_y = int(h * 0.60)

        try:
            det = vehicle_detector.detect(image, confidence=conf)

            violations: list[RedLightViolation] = []

            if signal_state.lower() == "red":
                for v in det.vehicles:
                    bottom_y = v.bbox.y2
                    if bottom_y > stop_line_y:
                        violations.append(
                            RedLightViolation(
                                vehicle_bbox=v.bbox,
                                vehicle_type=v.vehicle_type,
                                signal_state="red",
                                crossed_line=True,
                            )
                        )

            elapsed = (time.perf_counter() - start) * 1000
            logger.debug(
                f"Red-light check: signal={signal_state}, "
                f"{len(violations)} violations in {elapsed:.1f}ms",
                frame_id=frame_id,
            )

            return RedLightResult(
                frame_id=frame_id,
                signal_id=signal_id,
                violations=violations,
                total_violations=len(violations),
                processing_time_ms=round(elapsed, 2),
            )

        except DetectionError:
            raise
        except Exception as exc:
            raise DetectionError("red_light_detector", str(exc)) from exc


# Module-level instance
red_light_detector = RedLightDetector()
