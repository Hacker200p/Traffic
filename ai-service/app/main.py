"""
Autonomous Traffic Light Control System – AI Microservice
==========================================================
FastAPI application entry-point.

* Loads all ML models on startup via *lifespan*.
* Mounts detection, density, plate-recognition and health routers.
* Configures CORS, Prometheus metrics, and global exception handlers.
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.config.settings import get_settings
from app.utils.logger import logger
from app.utils.exceptions import AIServiceError
from app.services import (
    vehicle_detector,
    density_analyzer,
    helmet_detector,
    red_light_detector,
    plate_reader,
    seatbelt_detector,
    accident_detector,
    route_prediction_service,
    backend_client,
)
from app.routers import (
    detection_router,
    density_router,
    plate_router,
    health_router,
    accident_router,
    prediction_router,
)

settings = get_settings()


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hook."""
    logger.info("🚀 AI-Service starting up …")
    start = time.perf_counter()

    # Load ML models (order doesn't matter – they are independent)
    vehicle_detector.load_model()
    density_analyzer.load_model()
    helmet_detector.load_model()
    red_light_detector.load_model()
    plate_reader.load_model()
    seatbelt_detector.load_model()
    accident_detector.load_model()
    route_prediction_service.load_model()

    elapsed = time.perf_counter() - start
    logger.info(f"✅ All models loaded in {elapsed:.1f}s")

    yield  # ── app is serving ──

    # Shutdown
    logger.info("🛑 AI-Service shutting down …")
    await backend_client.close()
    logger.info("Goodbye.")


# ── App factory ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Traffic AI Microservice",
    description=(
        "Computer-vision micro-service for the Autonomous Traffic Light "
        "Control System.  Provides vehicle detection, traffic-density "
        "analysis, helmet detection, seatbelt detection, red-light violation "
        "detection, speed violation detection, wrong-lane detection, "
        "accident detection, and number-plate recognition."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Prometheus metrics ───────────────────────────────────────────────────────
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


# ── Global exception handlers ────────────────────────────────────────────────
@app.exception_handler(AIServiceError)
async def ai_service_error_handler(_request: Request, exc: AIServiceError):
    logger.error(f"[{exc.__class__.__name__}] {exc.message}")
    return JSONResponse(
        status_code=422,
        content={"success": False, "error": exc.message},
    )


@app.exception_handler(Exception)
async def generic_error_handler(_request: Request, exc: Exception):
    logger.exception("Unhandled exception")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error"},
    )


# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(detection_router, prefix="/api/v1")
app.include_router(density_router, prefix="/api/v1")
app.include_router(plate_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1")
app.include_router(accident_router, prefix="/api/v1")
app.include_router(prediction_router, prefix="/api/v1")


# ── Root ─────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "Traffic AI Microservice",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
