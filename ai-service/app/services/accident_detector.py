"""Accident detection service — analyses GPS telemetry and camera frames for accidents."""

from __future__ import annotations

import math
import time
from typing import Optional

from app.utils.logger import logger


class AccidentDetector:
    """
    Detects potential accidents from vehicle telemetry data:
      1. Sudden stop  — speed drops from >30 km/h to <5 km/h within 3 seconds
      2. Collision     — two vehicles with overlapping positions at the same time
      3. Unusual motion — erratic heading changes (>120° total in 3 data-points)
    """

    # ── Thresholds ────────────────────────────────────────────────────────
    SUDDEN_STOP_SPEED_FROM: float = 30.0   # km/h
    SUDDEN_STOP_SPEED_TO: float = 5.0      # km/h
    SUDDEN_STOP_WINDOW_S: float = 3.0      # seconds

    COLLISION_RADIUS_M: float = 5.0        # metres
    COLLISION_TIME_S: float = 2.0          # seconds

    ERRATIC_HEADING_DEG: float = 120.0     # degrees
    MIN_SPEED_FOR_ERRATIC: float = 10.0    # km/h — ignore if stopped

    _loaded: bool = False

    def load_model(self) -> None:
        """No ML model needed — rule-based detection on telemetry."""
        self._loaded = True
        logger.info("Accident detector loaded (rule-based telemetry analysis)")

    # ── Analyse a single vehicle's recent telemetry ──────────────────────

    def analyse_telemetry(
        self,
        vehicle_id: str,
        points: list[dict],
    ) -> dict:
        """
        Analyse a sequence of GPS points for one vehicle.

        Each point: { latitude, longitude, speed, heading, timestamp }
        Returns: { detected: bool, type?, severity?, data? }
        """
        start = time.perf_counter()

        if len(points) < 2:
            return {"detected": False, "processing_time_ms": 0.0}

        sorted_pts = sorted(points, key=lambda p: p["timestamp"])

        # 1. Sudden stop
        for i in range(1, len(sorted_pts)):
            prev, curr = sorted_pts[i - 1], sorted_pts[i]
            dt = self._time_diff_s(prev["timestamp"], curr["timestamp"])
            if dt <= 0 or dt > self.SUDDEN_STOP_WINDOW_S:
                continue

            if (
                prev.get("speed", 0) >= self.SUDDEN_STOP_SPEED_FROM
                and curr.get("speed", 0) <= self.SUDDEN_STOP_SPEED_TO
            ):
                elapsed = (time.perf_counter() - start) * 1000
                return {
                    "detected": True,
                    "type": "sudden_stop",
                    "severity": "critical" if prev["speed"] > 60 else "high",
                    "data": {
                        "vehicle_id": vehicle_id,
                        "speed_before": prev["speed"],
                        "speed_after": curr["speed"],
                        "deceleration_window_s": dt,
                        "location": {
                            "latitude": curr["latitude"],
                            "longitude": curr["longitude"],
                        },
                        "timestamp": curr["timestamp"],
                    },
                    "processing_time_ms": elapsed,
                }

        # 2. Unusual motion (erratic heading)
        if len(sorted_pts) >= 3:
            for i in range(2, len(sorted_pts)):
                h1 = sorted_pts[i - 2].get("heading", 0) or 0
                h2 = sorted_pts[i - 1].get("heading", 0) or 0
                h3 = sorted_pts[i].get("heading", 0) or 0

                delta1 = abs(((h2 - h1 + 540) % 360) - 180)
                delta2 = abs(((h3 - h2 + 540) % 360) - 180)

                if (
                    delta1 + delta2 >= self.ERRATIC_HEADING_DEG
                    and sorted_pts[i].get("speed", 0) > self.MIN_SPEED_FOR_ERRATIC
                ):
                    elapsed = (time.perf_counter() - start) * 1000
                    return {
                        "detected": True,
                        "type": "unusual_motion",
                        "severity": "high",
                        "data": {
                            "vehicle_id": vehicle_id,
                            "heading_changes": [delta1, delta2],
                            "speed": sorted_pts[i]["speed"],
                            "location": {
                                "latitude": sorted_pts[i]["latitude"],
                                "longitude": sorted_pts[i]["longitude"],
                            },
                            "timestamp": sorted_pts[i]["timestamp"],
                        },
                        "processing_time_ms": elapsed,
                    }

        elapsed = (time.perf_counter() - start) * 1000
        return {"detected": False, "processing_time_ms": elapsed}

    # ── Collision detection between two vehicle tracks ───────────────────

    def detect_collision(
        self,
        points_a: list[dict],
        points_b: list[dict],
    ) -> dict:
        """Check whether two vehicles' GPS tracks overlap spatially and temporally."""
        start = time.perf_counter()

        for a in points_a:
            for b in points_b:
                dt = abs(self._time_diff_s(a["timestamp"], b["timestamp"]))
                if dt > self.COLLISION_TIME_S:
                    continue

                dist = self._haversine_m(
                    a["latitude"], a["longitude"],
                    b["latitude"], b["longitude"],
                )
                if dist <= self.COLLISION_RADIUS_M:
                    elapsed = (time.perf_counter() - start) * 1000
                    return {
                        "detected": True,
                        "type": "collision",
                        "severity": "critical",
                        "data": {
                            "vehicle_a": {
                                "vehicle_id": a.get("vehicle_id"),
                                "speed": a.get("speed", 0),
                            },
                            "vehicle_b": {
                                "vehicle_id": b.get("vehicle_id"),
                                "speed": b.get("speed", 0),
                            },
                            "distance_m": round(dist, 2),
                            "location": {
                                "latitude": (a["latitude"] + b["latitude"]) / 2,
                                "longitude": (a["longitude"] + b["longitude"]) / 2,
                            },
                            "timestamp": a["timestamp"],
                        },
                        "processing_time_ms": elapsed,
                    }

        elapsed = (time.perf_counter() - start) * 1000
        return {"detected": False, "processing_time_ms": elapsed}

    # ── Helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _time_diff_s(ts1: str, ts2: str) -> float:
        """Return difference in seconds between two ISO timestamps."""
        from datetime import datetime, timezone

        def _parse(ts: str) -> float:
            # Handle both Z and +00:00 suffixes
            ts = ts.replace("Z", "+00:00")
            try:
                return datetime.fromisoformat(ts).timestamp()
            except Exception:
                return 0.0

        return _parse(ts2) - _parse(ts1)

    @staticmethod
    def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Haversine distance in metres."""
        R = 6_371_000
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2) ** 2
        )
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# Singleton
accident_detector = AccidentDetector()
