#!/usr/bin/env bash
# =============================================================================
# backup.sh — Database backup with rotation
# Usage: ./deploy/scripts/backup.sh
# Cron:  0 2 * * * /path/to/deploy/scripts/backup.sh >> /var/log/traffic-backup.log 2>&1
# =============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/traffic}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

# Load env
if [ -f .env ]; then source .env; fi

DB_NAME="${DB_NAME:-traffic_control}"
DB_USER="${DB_USER:-postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup of $DB_NAME..."

# Dump via docker exec, compress on the fly
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom --compress=9 \
  > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: $BACKUP_FILE ($SIZE)"

# Rotate old backups
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
echo "[$(date -Iseconds)] Cleaned $DELETED backups older than ${RETENTION_DAYS} days"

# Also dump Redis (RDB snapshot)
REDIS_BACKUP="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli -a "${REDIS_PASSWORD}" BGSAVE &>/dev/null
sleep 2
docker cp traffic_redis:/data/dump.rdb "$REDIS_BACKUP" 2>/dev/null || echo "  Redis RDB copy skipped"

echo "[$(date -Iseconds)] Backup finished."
