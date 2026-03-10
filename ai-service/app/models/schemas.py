from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ────────────────────────────────────────────────────────────
# Enums
# ────────────────────────────────────────────────────────────

class VehicleType(str, Enum):
    CAR = "car"
    TRUCK = "truck"
    BUS = "bus"
    MOTORCYCLE = "motorcycle"
    BICYCLE = "bicycle"
    EMERGENCY = "emergency"
    UNKNOWN = "unknown"


class DensityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ViolationType(str, Enum):
    RED_LIGHT = "red_light"
    NO_HELMET = "no_helmet"
    SPEEDING = "speeding"
    OTHER = "other"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ────────────────────────────────────────────────────────────
# Bounding-box primitive
# ────────────────────────────────────────────────────────────

class BoundingBox(BaseModel):
    x1: float = Field(..., description="Top-left X")
    y1: float = Field(..., description="Top-left Y")
    x2: float = Field(..., description="Bottom-right X")
    y2: float = Field(..., description="Bottom-right Y")
    confidence: float = Field(..., ge=0.0, le=1.0)
    label: str = ""


# ────────────────────────────────────────────────────────────
# Detection results
# ────────────────────────────────────────────────────────────

class DetectedVehicle(BaseModel):
    vehicle_type: VehicleType
    bbox: BoundingBox
    track_id: Optional[int] = None


class VehicleDetectionResult(BaseModel):
    frame_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    image_width: int
    image_height: int
    vehicles: list[DetectedVehicle] = []
    total_count: int = 0
    processing_time_ms: float = 0.0


class DensityResult(BaseModel):
    frame_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    vehicle_count: int = 0
    density_level: DensityLevel = DensityLevel.LOW
    occupancy_ratio: float = Field(default=0.0, ge=0.0, le=1.0)
    vehicles_per_lane: Optional[dict[str, int]] = None
    suggested_green_duration: Optional[int] = None
    processing_time_ms: float = 0.0


class HelmetDetection(BaseModel):
    bbox: BoundingBox
    has_helmet: bool
    rider_bbox: Optional[BoundingBox] = None


class HelmetDetectionResult(BaseModel):
    frame_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    detections: list[HelmetDetection] = []
    total_riders: int = 0
    without_helmet: int = 0
    processing_time_ms: float = 0.0


class RedLightViolation(BaseModel):
    vehicle_bbox: BoundingBox
    vehicle_type: VehicleType = VehicleType.UNKNOWN
    plate_text: Optional[str] = None
    signal_state: str = "red"
    crossed_line: bool = False


class RedLightResult(BaseModel):
    frame_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    signal_id: Optional[str] = None
    violations: list[RedLightViolation] = []
    total_violations: int = 0
    processing_time_ms: float = 0.0


class SeatbeltDetection(BaseModel):
    bbox: BoundingBox
    has_seatbelt: bool


class SeatbeltDetectionResult(BaseModel):
    frame_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    detections: list[SeatbeltDetection] = []
    total_occupants: int = 0
    without_seatbelt: int = 0
    processing_time_ms: float = 0.0


class SpeedViolation(BaseModel):
    vehicle_bbox: BoundingBox
    vehicle_type: VehicleType = VehicleType.UNKNOWN
    speed: float = 0.0
    speed_limit: float = 0.0


class SpeedDetectionResult(BaseModel):
    frame_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    signal_id: Optional[str] = None
    speed_limit: float = 0.0
    violations: list[SpeedViolation] = []
    total_violations: int = 0
    processing_time_ms: float = 0.0


class WrongLaneViolation(BaseModel):
    vehicle_bbox: BoundingBox
    vehicle_type: VehicleType = VehicleType.UNKNOWN
    reason: str = ""


class WrongLaneDetectionResult(BaseModel):
    frame_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    signal_id: Optional[str] = None
    violations: list[WrongLaneViolation] = []
    total_violations: int = 0
    processing_time_ms: float = 0.0


class PlateReading(BaseModel):
    bbox: BoundingBox
    plate_text: str
    ocr_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    region: Optional[str] = None


class PlateRecognitionResult(BaseModel):
    frame_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    plates: list[PlateReading] = []
    total_detected: int = 0
    processing_time_ms: float = 0.0


# ────────────────────────────────────────────────────────────
# Backend API payloads
# ────────────────────────────────────────────────────────────

class ViolationPayload(BaseModel):
    """Payload sent to the Node.js backend /violations endpoint."""
    vehicle_id: Optional[str] = None
    type: ViolationType
    description: str = ""
    latitude: float
    longitude: float
    speed: Optional[float] = None
    speed_limit: Optional[float] = None
    evidence_url: Optional[str] = None
    signal_id: Optional[str] = None
    severity: Severity = Severity.MEDIUM
    fine_amount: Optional[float] = None
    plate_text: Optional[str] = None


class TrackingPayload(BaseModel):
    """Payload sent to the Node.js backend /tracking endpoint."""
    vehicle_id: str
    latitude: float
    longitude: float
    speed: Optional[float] = None
    heading: Optional[float] = None
    timestamp: Optional[str] = None


class AlertPayload(BaseModel):
    """Payload sent to the Node.js backend /alerts endpoint."""
    type: str
    priority: Severity = Severity.MEDIUM
    title: str
    description: str = ""
    latitude: float
    longitude: float
    vehicle_id: Optional[str] = None
    signal_id: Optional[str] = None


class DensityPayload(BaseModel):
    """Internal density update for signal timing suggestions."""
    signal_id: str
    vehicle_count: int
    density_level: DensityLevel
    suggested_green_duration: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ────────────────────────────────────────────────────────────
# API request / response wrappers
# ────────────────────────────────────────────────────────────

class AnalysisRequest(BaseModel):
    """Query parameters shared by upload endpoints."""
    camera_id: Optional[str] = None
    signal_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    models_loaded: dict[str, bool] = {}
    uptime_seconds: float = 0.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class APIResponse(BaseModel):
    success: bool = True
    data: Optional[dict] = None
    error: Optional[str] = None
    processing_time_ms: float = 0.0
