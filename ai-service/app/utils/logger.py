"""Structured logging powered by Loguru."""

from __future__ import annotations

import sys
from pathlib import Path

from loguru import logger as _logger

from app.config.settings import get_settings


def setup_logging() -> None:
    """Configure Loguru sinks once at startup."""
    settings = get_settings()
    log_path: Path = settings.log_path

    # Remove default stderr sink so we can reconfigure it
    _logger.remove()

    # Console sink ─ coloured, human-friendly
    _logger.add(
        sys.stderr,
        level=settings.log_level,
        format=(
            "<green>{time:HH:mm:ss.SSS}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
            "<level>{message}</level>"
        ),
        colorize=True,
        backtrace=True,
        diagnose=not settings.is_production,
    )

    # JSON file sink ─ structured for log aggregation
    _logger.add(
        str(log_path / "ai-service.log"),
        level=settings.log_level,
        format="{message}",
        serialize=True,           # JSON lines
        rotation=settings.log_rotation,
        retention=settings.log_retention,
        compression="gz",
        enqueue=True,             # thread-safe async writes
    )

    # Error-only file sink
    _logger.add(
        str(log_path / "errors.log"),
        level="ERROR",
        format="{message}",
        serialize=True,
        rotation=settings.log_rotation,
        retention=settings.log_retention,
        compression="gz",
        enqueue=True,
    )

    _logger.info(
        "Logging initialised",
        env=settings.env,
        level=settings.log_level,
        log_dir=str(log_path),
    )


# Re-export so importing files use `from app.utils.logger import logger`
logger = _logger
