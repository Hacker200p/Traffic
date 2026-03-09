"""Image I/O and pre-processing helpers."""

from __future__ import annotations

import io
import uuid
from typing import Optional

import cv2
import numpy as np
from PIL import Image

from app.config.settings import get_settings
from app.utils.logger import logger
from app.utils.exceptions import ImageProcessingError


async def decode_upload(file_bytes: bytes, max_size: Optional[int] = None) -> np.ndarray:
    """Decode uploaded bytes into a BGR numpy array (OpenCV format).

    Raises ``ImageProcessingError`` on invalid or oversized images.
    """
    settings = get_settings()
    max_dim = max_size or settings.max_image_size

    try:
        arr = np.frombuffer(file_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        if img is None:
            raise ImageProcessingError("Could not decode image bytes")

        h, w = img.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            logger.debug(f"Resized image from {w}x{h} → {new_w}x{new_h}")

        return img

    except ImageProcessingError:
        raise
    except Exception as exc:
        raise ImageProcessingError(str(exc)) from exc


def bgr_to_rgb(img: np.ndarray) -> np.ndarray:
    """Convert OpenCV BGR to RGB."""
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def crop_region(img: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> np.ndarray:
    """Crop a rectangular region from an image. Clamps to boundaries."""
    h, w = img.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    return img[y1:y2, x1:x2]


def encode_jpeg(img: np.ndarray, quality: Optional[int] = None) -> bytes:
    """Encode a BGR numpy array as JPEG bytes."""
    settings = get_settings()
    q = quality or settings.jpeg_quality
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, q])
    if not ok:
        raise ImageProcessingError("JPEG encoding failed")
    return buf.tobytes()


def draw_boxes(
    img: np.ndarray,
    boxes: list[dict],
    color: tuple[int, int, int] = (0, 255, 0),
    thickness: int = 2,
) -> np.ndarray:
    """Draw bounding boxes on an image copy. Each box dict: {x1 y1 x2 y2 label confidence}."""
    out = img.copy()
    for b in boxes:
        x1, y1, x2, y2 = int(b["x1"]), int(b["y1"]), int(b["x2"]), int(b["y2"])
        cv2.rectangle(out, (x1, y1), (x2, y2), color, thickness)
        label = f"{b.get('label', '')} {b.get('confidence', 0):.2f}"
        cv2.putText(out, label, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
    return out


def generate_frame_id() -> str:
    """Generate a unique frame identifier."""
    return uuid.uuid4().hex[:12]
