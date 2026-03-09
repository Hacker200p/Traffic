# =============================================================================
# Backend API — Multi-stage production Dockerfile
# Node 20 LTS on Alpine for minimal attack surface
# =============================================================================

# ── Stage 1: production-only dependencies ────────────────────────────────────
FROM node:20-alpine AS prod-deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ── Stage 2: final runtime image ────────────────────────────────────────────
FROM node:20-alpine AS runtime

# dumb-init for proper PID 1 signal handling; wget for healthcheck
RUN apk add --no-cache dumb-init wget

WORKDIR /app

# Non-root user (UID/GID 1001)
RUN addgroup -g 1001 -S appgroup && \
    adduser  -S appuser -u 1001 -G appgroup

# Production dependencies only
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./

# Application source
COPY src/ ./src/

# Logs directory owned by appuser
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

# Runtime hardening
ENV NODE_ENV=production \
    # Prevent Node from buffering logs
    NODE_OPTIONS="--max-old-space-size=512" \
    TZ=UTC

USER appuser
EXPOSE 3000

# ── Health check — hit the /health liveness endpoint ─────────────────────────
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Labels for container registries
LABEL org.opencontainers.image.title="traffic-backend" \
      org.opencontainers.image.description="Autonomous Traffic Control — Node.js API" \
      org.opencontainers.image.version="1.0.0"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
