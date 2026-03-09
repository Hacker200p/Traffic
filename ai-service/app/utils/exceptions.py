"""Custom exception hierarchy for the AI service."""

from __future__ import annotations
from typing import Any


class AIServiceError(Exception):
    """Base exception for the AI micro-service."""

    def __init__(self, message: str = "Internal AI service error", detail: Any = None):
        self.message = message
        self.detail = detail
        super().__init__(self.message)


class ModelLoadError(AIServiceError):
    """Raised when a YOLO / OCR model fails to load."""

    def __init__(self, model_name: str, reason: str = ""):
        super().__init__(
            message=f"Failed to load model '{model_name}': {reason}",
            detail={"model": model_name, "reason": reason},
        )


class ImageProcessingError(AIServiceError):
    """Raised when an image cannot be decoded or pre-processed."""

    def __init__(self, reason: str = ""):
        super().__init__(
            message=f"Image processing failed: {reason}",
            detail={"reason": reason},
        )


class DetectionError(AIServiceError):
    """Raised when inference / detection fails."""

    def __init__(self, service: str, reason: str = ""):
        super().__init__(
            message=f"Detection error in {service}: {reason}",
            detail={"service": service, "reason": reason},
        )


class BackendAPIError(AIServiceError):
    """Raised when a call to the Node.js backend fails."""

    def __init__(self, endpoint: str, status_code: int | None = None, reason: str = ""):
        super().__init__(
            message=f"Backend API error ({endpoint}): {status_code} – {reason}",
            detail={"endpoint": endpoint, "status_code": status_code, "reason": reason},
        )


class ThrottledError(AIServiceError):
    """Raised when the service is overloaded and cannot accept more work."""

    def __init__(self):
        super().__init__(
            message="Service is at maximum concurrent task capacity",
            detail={"code": "THROTTLED"},
        )
