#!/usr/bin/env bash
# =============================================================================
# health-check.sh — Check all services and report status
# Usage: ./deploy/scripts/health-check.sh [--json]
# =============================================================================
set -euo pipefail

JSON_OUTPUT=false
[[ "${1:-}" == "--json" ]] && JSON_OUTPUT=true

GATEWAY_URL="${GATEWAY_URL:-http://localhost}"
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
AI_URL="${AI_URL:-http://localhost:8001}"

check_service() {
  local name="$1"
  local url="$2"
  local timeout="${3:-5}"

  local status_code
  status_code=$(curl -sf -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null) || status_code="000"

  local status="unhealthy"
  [[ "$status_code" == "200" ]] && status="healthy"

  if $JSON_OUTPUT; then
    echo "    \"$name\": {\"url\": \"$url\", \"status\": \"$status\", \"code\": $status_code}"
  else
    local icon="❌"
    [[ "$status" == "healthy" ]] && icon="✅"
    printf "  %s %-20s %s (HTTP %s)\n" "$icon" "$name" "$url" "$status_code"
  fi
}

if $JSON_OUTPUT; then
  echo "{"
  echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"services\": {"
fi

check_service "gateway"      "$GATEWAY_URL/"
check_service "backend"      "$GATEWAY_URL/health"
check_service "backend-api"  "$GATEWAY_URL/api/v1/integration/health" || true
check_service "ai-service"   "$GATEWAY_URL/ai/health"
check_service "nginx-status" "http://localhost:8080/nginx_status"

# Docker container status
if ! $JSON_OUTPUT; then
  echo ""
  echo "Docker containers:"
  docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || \
    echo "  (docker compose not available or not running)"
fi

if $JSON_OUTPUT; then
  echo "  }"
  echo "}"
fi
