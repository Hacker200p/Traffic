# =============================================================================
# AI Microservice — Multi-stage production Dockerfile
# Python 3.10 slim for OpenCV / EasyOCR / YOLOv8 compatibility
# =============================================================================

# ── Stage 1: Build + compile wheels ──────────────────────────────────────────
FROM python:3.10-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# System deps for opencv & easyocr C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libgl1-mesa-glx \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt


# ── Stage 2: Production runtime ─────────────────────────────────────────────
FROM python:3.10-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=UTC

# Minimal runtime libs (no compilers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1-mesa-glx \
    libsm6 \
    libxext6 \
    libxrender1 \
    curl \
    tini \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge -y --auto-remove

# Copy pre-built Python packages
COPY --from=builder /install /usr/local

WORKDIR /app

# Copy application code
COPY . .

# Writable directories for logs and models
RUN mkdir -p /app/models /app/logs /app/tmp

# Non-root user
RUN groupadd -r appuser && \
    useradd  -r -g appuser -d /app -s /sbin/nologin appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8001

# ── Health check — hit the FastAPI health endpoint ───────────────────────────
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -sf http://localhost:8001/api/v1/health || exit 1

LABEL org.opencontainers.image.title="traffic-ai-service" \
      org.opencontainers.image.description="Autonomous Traffic Control — AI Detection Service" \
      org.opencontainers.image.version="1.0.0"

# tini as PID 1 for signal handling
ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8001", \
     "--workers", "2", \
     "--limit-concurrency", "20", \
     "--timeout-keep-alive", "30", \
     "--access-log"]
