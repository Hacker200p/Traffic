# =============================================================================
# Frontend Dashboard — Multi-stage production Dockerfile
# Builds React/Vite SPA then serves via nginx
# =============================================================================

# ── Stage 1: dependency install ──────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# ── Stage 2: build SPA ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars — injected at build so Vite can inline them
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_WS_URL=
ARG VITE_MAPBOX_TOKEN=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN

RUN npm run build

# ── Stage 3: production nginx ───────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx site
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy SPA nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Security: run as non-root (nginx user already exists on alpine)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 80

# ── Health check ─────────────────────────────────────────────────────────────
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1

LABEL org.opencontainers.image.title="traffic-frontend" \
      org.opencontainers.image.description="Autonomous Traffic Control — React Dashboard" \
      org.opencontainers.image.version="1.0.0"

CMD ["nginx", "-g", "daemon off;"]
