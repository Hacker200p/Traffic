"""API router package – re-exports all sub-routers."""

from app.routers.detection import router as detection_router
from app.routers.density import router as density_router
from app.routers.plate import router as plate_router
from app.routers.health import router as health_router
from app.routers.accident import router as accident_router
from app.routers.prediction import router as prediction_router

__all__ = [
    "detection_router",
    "density_router",
    "plate_router",
    "health_router",
    "accident_router",
    "prediction_router",
]
