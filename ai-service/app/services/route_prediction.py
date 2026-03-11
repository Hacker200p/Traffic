"""
Route Prediction Service
========================
Analyses vehicle sighting history and predicts the most likely future path.
Uses geometric trajectory projection and intersection matching.
"""

from __future__ import annotations

import math
from typing import Any

from app.utils.logger import logger


class RoutePredictionService:
    """Rule-based route prediction from GPS / camera sighting history."""

    EARTH_RADIUS_KM = 6371.0
    CORRIDOR_WIDTH_KM = 1.5
    PROJECTION_STEP_KM = 0.5
    MAX_PROJECTION_KM = 20.0
    DEFAULT_SPEED_KMH = 40.0

    def load_model(self) -> None:
        """No ML model needed — purely geometric for now."""
        logger.info("Route prediction service ready (rule-based)")

    # ── Public API ───────────────────────────────────────────────────────

    def predict_route(
        self,
        sightings: list[dict[str, Any]],
        intersections: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """
        Given chronologically sorted sighting dicts with keys:
          latitude, longitude, speed (optional), heading (optional), timestamp
        and an optional list of known intersection dicts with:
          id, name, latitude, longitude
        returns a prediction dict with movement_vector, projected_path,
        and matched_intersections.
        """
        if len(sightings) < 2:
            return {"predicted": False, "reason": "insufficient_data"}

        vector = self._compute_vector(sightings)
        path = self._project_path(vector)

        matched: list[dict] = []
        if intersections:
            matched = self._match_intersections(path, intersections, vector)

        return {
            "predicted": True,
            "movement_vector": vector,
            "projected_path": path,
            "matched_intersections": matched,
        }

    # ── Internal helpers ─────────────────────────────────────────────────

    def _compute_vector(self, sightings: list[dict]) -> dict:
        recent = sightings[-10:]
        first, last = recent[0], recent[-1]

        speeds = [float(p["speed"]) for p in recent if p.get("speed")]
        avg_speed = (sum(speeds) / len(speeds)) if speeds else self.DEFAULT_SPEED_KMH

        bearing = self._bearing(
            float(first["latitude"]), float(first["longitude"]),
            float(last["latitude"]), float(last["longitude"]),
        )

        headings = [float(p["heading"]) for p in recent if p.get("heading")]
        avg_heading = self._average_angle(headings) if headings else bearing

        return {
            "last_latitude": float(last["latitude"]),
            "last_longitude": float(last["longitude"]),
            "last_seen": last.get("timestamp") or last.get("detected_at"),
            "heading": round(avg_heading, 1),
            "bearing": round(bearing, 1),
            "avg_speed_kmh": round(avg_speed, 1),
            "points_analysed": len(recent),
        }

    def _project_path(self, vector: dict) -> list[dict]:
        waypoints: list[dict] = []
        max_km = min(
            self.MAX_PROJECTION_KM,
            vector["avg_speed_kmh"] * (15 / 60),  # 15 minutes
        )
        dist = self.PROJECTION_STEP_KM
        while dist <= max_km:
            pt = self._destination(
                vector["last_latitude"], vector["last_longitude"],
                vector["heading"], dist,
            )
            eta_min = (dist / vector["avg_speed_kmh"]) * 60 if vector["avg_speed_kmh"] > 0 else None
            waypoints.append({
                "latitude": round(pt[0], 6),
                "longitude": round(pt[1], 6),
                "distance_km": round(dist, 2),
                "eta_minutes": round(eta_min, 1) if eta_min else None,
            })
            dist += self.PROJECTION_STEP_KM
        return waypoints

    def _match_intersections(
        self, path: list[dict], intersections: list[dict], vector: dict,
    ) -> list[dict]:
        corridor_m = self.CORRIDOR_WIDTH_KM * 1000
        results: list[dict] = []

        for ix in intersections:
            ix_lat, ix_lng = float(ix["latitude"]), float(ix["longitude"])
            near = any(
                self._haversine_m(wp["latitude"], wp["longitude"], ix_lat, ix_lng) <= corridor_m
                for wp in path
            )
            if not near:
                continue

            dist_km = self._haversine_km(
                vector["last_latitude"], vector["last_longitude"], ix_lat, ix_lng,
            )
            eta = (dist_km / vector["avg_speed_kmh"]) * 60 if vector["avg_speed_kmh"] > 0 else None

            # Confidence: closer to projected line → higher
            min_dist = min(
                self._haversine_km(wp["latitude"], wp["longitude"], ix_lat, ix_lng)
                for wp in path
            )
            confidence = max(0, round((1 - min_dist / self.CORRIDOR_WIDTH_KM) * 100))

            results.append({
                "id": ix.get("id"),
                "name": ix.get("name"),
                "latitude": ix_lat,
                "longitude": ix_lng,
                "distance_km": round(dist_km, 2),
                "eta_minutes": round(eta, 1) if eta else None,
                "confidence": confidence,
            })

        results.sort(key=lambda x: (-x["confidence"], x["distance_km"]))
        return results

    # ── Geo math ─────────────────────────────────────────────────────────

    def _haversine_km(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        R = self.EARTH_RADIUS_KM
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = (math.sin(dlat / 2) ** 2
             + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
             * math.sin(dlng / 2) ** 2)
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def _haversine_m(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        return self._haversine_km(lat1, lng1, lat2, lng2) * 1000

    def _bearing(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        dlng = math.radians(lng2 - lng1)
        y = math.sin(dlng) * math.cos(math.radians(lat2))
        x = (math.cos(math.radians(lat1)) * math.sin(math.radians(lat2))
             - math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(dlng))
        return (math.degrees(math.atan2(y, x)) + 360) % 360

    def _destination(self, lat: float, lng: float, bearing_deg: float, dist_km: float) -> tuple[float, float]:
        R = self.EARTH_RADIUS_KM
        d = dist_km / R
        brng = math.radians(bearing_deg)
        lat1 = math.radians(lat)
        lng1 = math.radians(lng)

        lat2 = math.asin(
            math.sin(lat1) * math.cos(d)
            + math.cos(lat1) * math.sin(d) * math.cos(brng)
        )
        lng2 = lng1 + math.atan2(
            math.sin(brng) * math.sin(d) * math.cos(lat1),
            math.cos(d) - math.sin(lat1) * math.sin(lat2),
        )
        return math.degrees(lat2), math.degrees(lng2)

    def _average_angle(self, angles: list[float]) -> float:
        sin_sum = sum(math.sin(math.radians(a)) for a in angles)
        cos_sum = sum(math.cos(math.radians(a)) for a in angles)
        return (math.degrees(math.atan2(sin_sum / len(angles), cos_sum / len(angles))) + 360) % 360


route_prediction_service = RoutePredictionService()
