from __future__ import annotations

from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Server ──────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 2
    env: str = "development"
    debug: bool = True

    # ── Backend API ─────────────────────────────────────────
    backend_api_url: str = "http://localhost:3000/api/v1"
    backend_api_key: str = ""
    backend_timeout: int = 30

    # ── YOLO Models ─────────────────────────────────────────
    yolo_vehicle_model: str = "models/yolov8n.pt"
    yolo_helmet_model: str = "models/yolov8n.pt"
    yolo_plate_model: str = "models/yolov8n.pt"

    # ── Detection Thresholds ────────────────────────────────
    vehicle_confidence: float = Field(default=0.45, ge=0.0, le=1.0)
    helmet_confidence: float = Field(default=0.50, ge=0.0, le=1.0)
    plate_confidence: float = Field(default=0.40, ge=0.0, le=1.0)
    red_light_confidence: float = Field(default=0.50, ge=0.0, le=1.0)

    # ── Traffic Density ─────────────────────────────────────
    density_low_threshold: int = 5
    density_medium_threshold: int = 15
    density_high_threshold: int = 30

    # ── EasyOCR ─────────────────────────────────────────────
    ocr_languages: str = "en"
    ocr_gpu: bool = False

    # ── Processing ──────────────────────────────────────────
    max_image_size: int = 4096
    jpeg_quality: int = 85
    batch_size: int = 8
    max_concurrent_tasks: int = 10

    # ── Logging ─────────────────────────────────────────────
    log_level: str = "DEBUG"
    log_dir: str = "logs"
    log_rotation: str = "50 MB"
    log_retention: str = "30 days"

    # ── Derived helpers ─────────────────────────────────────
    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @property
    def ocr_lang_list(self) -> list[str]:
        return [lang.strip() for lang in self.ocr_languages.split(",")]

    @property
    def log_path(self) -> Path:
        p = Path(self.log_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p


@lru_cache()
def get_settings() -> Settings:
    """Singleton settings instance (cached)."""
    return Settings()
