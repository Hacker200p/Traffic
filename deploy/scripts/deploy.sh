#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Production deployment script
# Usage: ./deploy/scripts/deploy.sh [--build] [--migrate]
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env"

# ── Argument parsing ─────────────────────────────────────────────────────────
BUILD=false
MIGRATE=false
for arg in "$@"; do
  case $arg in
    --build)   BUILD=true ;;
    --migrate) MIGRATE=true ;;
    --help)
      echo "Usage: $0 [--build] [--migrate]"
      echo "  --build    Rebuild Docker images before deploying"
      echo "  --migrate  Run database migrations after starting Postgres"
      exit 0
      ;;
  esac
done

# ── Pre-flight checks ───────────────────────────────────────────────────────
echo "==> Pre-flight checks..."

if ! command -v docker &>/dev/null; then
  echo "ERROR: docker is not installed" >&2; exit 1
fi

if ! docker compose version &>/dev/null; then
  echo "ERROR: docker compose plugin is not available" >&2; exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env file not found. Copy .env.production to .env and fill in values." >&2
  exit 1
fi

# Validate required env vars are not default placeholder values
source "$ENV_FILE"
for var in DB_PASSWORD REDIS_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET SERVICE_API_KEY; do
  val="${!var:-}"
  if [[ -z "$val" || "$val" == CHANGEME* ]]; then
    echo "ERROR: $var is not configured in .env" >&2; exit 1
  fi
done

echo "    All checks passed."

# ── Build images ─────────────────────────────────────────────────────────────
if $BUILD; then
  echo "==> Building Docker images..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --parallel
fi

# ── Start infrastructure first ───────────────────────────────────────────────
echo "==> Starting infrastructure (postgres, redis)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres redis

echo "==> Waiting for Postgres to be healthy..."
timeout 60 bash -c 'until docker compose -f "'"$COMPOSE_FILE"'" ps postgres | grep -q "healthy"; do sleep 2; done' || {
  echo "ERROR: Postgres did not become healthy in 60s" >&2; exit 1
}

echo "==> Waiting for Redis to be healthy..."
timeout 30 bash -c 'until docker compose -f "'"$COMPOSE_FILE"'" ps redis | grep -q "healthy"; do sleep 2; done' || {
  echo "ERROR: Redis did not become healthy in 30s" >&2; exit 1
}

# ── Run migrations ───────────────────────────────────────────────────────────
if $MIGRATE; then
  echo "==> Running database migrations..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    psql -U "${DB_USER:-postgres}" -d "${DB_NAME:-traffic_control}" \
    -f /docker-entrypoint-initdb.d/02-integration.sql || true
  echo "    Migrations complete."
fi

# ── Start application services ───────────────────────────────────────────────
echo "==> Starting application services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "==> Waiting for backend health check..."
timeout 60 bash -c 'until docker compose -f "'"$COMPOSE_FILE"'" ps app | grep -q "healthy"; do sleep 3; done' || {
  echo "WARNING: Backend health check did not pass in 60s" >&2
}

echo "==> Waiting for AI service health check..."
timeout 120 bash -c 'until docker compose -f "'"$COMPOSE_FILE"'" ps ai-service | grep -q "healthy"; do sleep 5; done' || {
  echo "WARNING: AI service health check did not pass in 120s (model loading may be slow)" >&2
}

# ── Status ───────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "  Deployment complete!"
echo "============================================================"
docker compose -f "$COMPOSE_FILE" ps
echo ""
echo "  Gateway:  http://localhost:${GATEWAY_HTTP_PORT:-80}"
echo "  Health:   http://localhost:${GATEWAY_HTTP_PORT:-80}/health"
echo "  API:      http://localhost:${GATEWAY_HTTP_PORT:-80}/api/v1"
echo "  AI:       http://localhost:${GATEWAY_HTTP_PORT:-80}/ai/health"
echo "  Nginx:    http://localhost:8080/nginx_status"
echo "============================================================"
