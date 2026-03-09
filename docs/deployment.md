# Production Deployment Guide

## Architecture

```
                            ┌─────────────┐
                Internet ──→│   Gateway   │──→ TLS termination
                            │ (Nginx:80)  │    Rate limiting
                            └──┬───┬───┬──┘    Security headers
                               │   │   │
                    ┌──────────┘   │   └──────────┐
                    ▼              ▼               ▼
              ┌──────────┐  ┌──────────┐   ┌─────────────┐
              │ Frontend  │  │ Backend  │   │ AI Service  │
              │(nginx:80) │  │(node:3k) │   │(uvicorn:8k1)│
              └──────────┘  └──┬───┬───┘   └─────────────┘
                               │   │
                        ┌──────┘   └──────┐
                        ▼                 ▼
                  ┌───────────┐    ┌──────────┐
                  │ PostgreSQL│    │  Redis    │
                  │ + PostGIS │    │  7-alpine │
                  └───────────┘    └──────────┘

Network segmentation:
  - traffic_public:   Gateway only (internet-facing)
  - traffic_internal: All services (no external access)
```

---

## Quick Start

```bash
# 1. Clone and enter project
cd /opt/traffic-control

# 2. Create production .env
cp .env.production .env

# 3. Generate secure secrets
sed -i "s/CHANGEME_USE_STRONG_PASSWORD_HERE/$(openssl rand -base64 32)/" .env
sed -i "s/CHANGEME_USE_STRONG_REDIS_PASSWORD/$(openssl rand -base64 32)/" .env
sed -i "s/CHANGEME_GENERATE_WITH_openssl_rand_base64_48/$(openssl rand -base64 48)/" .env
sed -i "s/CHANGEME_GENERATE_ANOTHER_WITH_openssl_rand_base64_48/$(openssl rand -base64 48)/" .env
sed -i "s/CHANGEME_GENERATE_WITH_openssl_rand_hex_32/$(openssl rand -hex 32)/" .env

# 4. Set your domain and Mapbox token
nano .env   # edit CORS_ORIGINS, VITE_MAPBOX_TOKEN

# 5. Deploy
chmod +x deploy/scripts/*.sh
./deploy/scripts/deploy.sh --build --migrate

# 6. Verify
./deploy/scripts/health-check.sh
```

---

## File Structure

```
deploy/
├── nginx/
│   ├── Dockerfile           # Gateway image
│   ├── nginx.conf           # Full reverse proxy config
│   └── 50x.html             # Custom error page
├── postgres/
│   └── postgresql.conf      # Tuned PG config
├── scripts/
│   ├── deploy.sh            # Automated deployment
│   ├── health-check.sh      # Service health verification
│   └── backup.sh            # DB backup + rotation
├── ssl/                     # TLS certificates (not committed)
│   ├── fullchain.pem
│   └── privkey.pem
docker-compose.prod.yml      # Production compose
.env.production              # Template env file
```

---

## Service Details

### Gateway (Nginx)
| Feature | Config |
|---|---|
| Rate limit (API) | 30 req/s, burst 60 |
| Rate limit (Auth) | 5 req/min, burst 10 |
| Rate limit (AI) | 10 req/s, burst 20 |
| WebSocket timeout | 24h keep-alive |
| Max body size | 10MB (API), 20MB (AI uploads) |
| Gzip | Level 5, min 256 bytes |
| JSON access log | Includes request_time, upstream times |
| Monitoring | `/nginx_status` on port 8080 (internal only) |

### Backend (Node.js)
| Feature | Config |
|---|---|
| Runtime | Node 20 Alpine + dumb-init |
| Health check | `GET /health` every 15s |
| Memory limit | 512MB (NODE_OPTIONS) |
| DB pool | 5–30 connections |
| Rate limit | Express-rate-limit (200 req/15min) |
| Logging | Winston → `/app/logs`, JSON format |

### AI Service (Python)
| Feature | Config |
|---|---|
| Runtime | Python 3.10 slim + tini |
| Health check | `GET /api/v1/health` every 15s |
| Workers | 2 uvicorn workers |
| Concurrency limit | 20 concurrent requests |
| Memory limit | 4GB (YOLO models are large) |
| GPU | Optional NVIDIA support (uncomment in compose) |

### PostgreSQL
| Feature | Config |
|---|---|
| Image | postgis/postgis:16-3.4-alpine |
| Auth | scram-sha-256 |
| shared_buffers | 256MB |
| effective_cache_size | 768MB |
| Slow query log | > 500ms |
| Autovacuum | Enabled, 3 workers |

### Redis
| Feature | Config |
|---|---|
| Max memory | 256MB, LRU eviction |
| Persistence | AOF + RDB snapshots |
| Timeout | 300s idle connections |

---

## Health Checks

Every service has a Docker `HEALTHCHECK` directive:

| Service | Endpoint | Interval | Start Period | Retries |
|---|---|---|---|---|
| Gateway | `GET /` | 10s | 5s | 3 |
| Backend | `GET /health` | 15s | 20s | 3 |
| AI Service | `GET /api/v1/health` | 15s | 90s | 3 |
| Frontend | `GET /` | 15s | 5s | 3 |
| PostgreSQL | `pg_isready` | 10s | 30s | 5 |
| Redis | `redis-cli ping` | 10s | 10s | 5 |

**Health check cascade:** Gateway → depends on `app` (healthy) + `frontend` (healthy).
Backend → depends on `postgres` (healthy) + `redis` (healthy).

---

## Logging Strategy

### Log Aggregation

All containers use the Docker `json-file` logging driver with rotation:

| Container | Max Size | Max Files |
|---|---|---|
| gateway | 10MB | 5 |
| backend | 20MB | 10 |
| ai-service | 20MB | 10 |
| postgres | 20MB | 5 |
| redis | 10MB | 3 |
| frontend | 5MB | 3 |

### Application Logs

| Service | Format | Location | Rotation |
|---|---|---|---|
| Backend | Winston JSON | `/app/logs/*.log` | Daily, 14 files |
| AI Service | Loguru JSON | `/app/logs/*.log` | 50MB, 30 days |
| Nginx | JSON access log | `/var/log/nginx/access.log` | via Docker driver |
| PostgreSQL | Text | Internal `log/` dir | Daily, 100MB |

### Centralized Logging (Recommended)

For production, ship logs to a centralized system:

```yaml
# Option A: Add to docker-compose.prod.yml for ELK/Loki
services:
  app:
    logging:
      driver: fluentd
      options:
        fluentd-address: "localhost:24224"
        tag: "traffic.backend"

# Option B: Use Docker log driver for CloudWatch/Datadog
  app:
    logging:
      driver: awslogs
      options:
        awslogs-region: "eu-west-1"
        awslogs-group: "traffic-control"
        awslogs-stream: "backend"
```

### Log Monitoring Alerts

Set up alerts for:
- Backend error rate > 1% of requests
- AI service response time p95 > 5s
- PostgreSQL slow queries > 10/min
- Redis memory usage > 80%
- Nginx 5xx rate > 0.5%
- Container restarts > 3 in 5 minutes

---

## Scaling Recommendations

### Horizontal Scaling

```
                         ┌───────────────┐
                         │   Gateway     │
                         │ (Nginx LB)    │
                         └─┬───┬───┬───┬─┘
                           │   │   │   │
              ┌────────────┘   │   │   └────────────┐
              ▼                ▼   ▼                ▼
         ┌─────────┐    ┌─────────┐ ┌─────────┐  ┌──────────┐
         │Backend-1│    │Backend-2│ │  AI-1   │  │  AI-2    │
         │(node)   │    │(node)   │ │(uvicorn)│  │(uvicorn) │
         └────┬────┘    └────┬────┘ └─────────┘  └──────────┘
              │              │
              └──────┬───────┘
                     ▼
            ┌────────────────┐     ┌──────────┐
            │ PostgreSQL     │     │  Redis   │
            │ (Read replica) │     │ (Sentinel│
            └────────────────┘     │  or      │
                                   │  Cluster)│
                                   └──────────┘
```

#### Backend (Node.js)

```yaml
# In docker-compose.prod.yml
app:
  deploy:
    replicas: 3
```

- **Stateless** — scale freely. Socket.io uses Redis adapter for multi-instance.
- Add `socket.io-redis` adapter for WebSocket state sharing across instances.
- Gateway Nginx `upstream backend` uses `least_conn` load balancing.

#### AI Service (Python)

```yaml
ai-service:
  deploy:
    replicas: 2
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

- **CPU-bound** — scale based on inference load.
- Each instance: 2 uvicorn workers × 20 concurrent = 40 req concurrency.
- With GPU: 1 instance can handle ~50 fps; scale for total camera count.

#### Database Scaling

| Stage | Strategy |
|---|---|
| Phase 1 (< 100K rows/day) | Single PostgreSQL, tune `postgresql.conf` |
| Phase 2 (< 1M rows/day) | Add read replica for analytics queries |
| Phase 3 (> 1M rows/day) | Partition `tracking_points` by month, archive old data |
| Phase 4 (> 10M rows/day) | Consider TimescaleDB extension for tracking data |

#### Redis Scaling

| Stage | Strategy |
|---|---|
| Single instance | Current setup (256MB, AOF) |
| High availability | Redis Sentinel (3-node) |
| High throughput | Redis Cluster (3+ shards) |

### Vertical Scaling Guidelines

| Service | Min | Recommended | High Load |
|---|---|---|---|
| Backend | 1 CPU, 512MB | 2 CPU, 1GB | 4 CPU, 2GB |
| AI Service | 2 CPU, 2GB | 4 CPU, 4GB | 8 CPU, 8GB + GPU |
| PostgreSQL | 1 CPU, 512MB | 2 CPU, 2GB | 4 CPU, 8GB |
| Redis | 0.5 CPU, 256MB | 1 CPU, 512MB | 2 CPU, 1GB |
| Gateway | 0.5 CPU, 128MB | 1 CPU, 256MB | 2 CPU, 512MB |

### Performance Targets

| Metric | Target |
|---|---|
| API response p95 | < 200ms |
| AI inference p95 | < 3s (CPU), < 500ms (GPU) |
| WebSocket latency | < 100ms |
| Dashboard load time | < 2s |
| Throughput (backend) | > 1000 req/s per instance |
| Throughput (AI) | > 10 frames/s per worker (CPU) |

---

## Production Security Checklist

### Infrastructure

- [ ] **TLS everywhere** — Uncomment SSL blocks in `deploy/nginx/nginx.conf`; use Let's Encrypt / Certbot
- [ ] **HSTS enabled** — Uncomment `Strict-Transport-Security` header after TLS confirmed
- [ ] **Firewall rules** — Only expose ports 80/443 externally; block 5432, 6379, 3000, 8001, 8080
- [ ] **Network segmentation** — `traffic_internal` is already `internal: true` (no external access)
- [ ] **DB port binding** — PostgreSQL bound to `127.0.0.1:5432` (not `0.0.0.0`)
- [ ] **Redis port binding** — Redis bound to `127.0.0.1:6379` (not `0.0.0.0`)
- [ ] **SSH hardened** — Key-only auth, disable root login, fail2ban installed

### Secrets Management

- [ ] **Strong passwords** — All generated with `openssl rand` (min 32 bytes)
- [ ] **JWT secrets** — Unique, min 48 bytes each (`openssl rand -base64 48`)
- [ ] **Service API key** — Shared between backend and AI service, min 32 hex chars
- [ ] **No secrets in code** — All secrets via `.env` file (excluded from Git)
- [ ] **`.env` not committed** — Verify `.gitignore` includes `.env`
- [ ] **Docker secrets** — Consider Docker Swarm secrets or Vault for production

### Application Security

- [ ] **Non-root containers** — All Dockerfiles use dedicated `appuser` (UID 1001)
- [ ] **Read-only filesystem** — Use `read_only: true` in compose where possible
- [ ] **Security headers** — X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- [ ] **Rate limiting** — Nginx (30 r/s API, 5 r/m auth) + Express (200/15min)
- [ ] **CORS restricted** — Only allow production domain
- [ ] **Input validation** — Zod schemas on all endpoints (backend), Pydantic on AI
- [ ] **SQL injection** — Parameterized queries throughout (`$1, $2` placeholders)
- [ ] **File upload limits** — 10MB API, 20MB AI; validated MIME types in AI service
- [ ] **JWT token management** — Short-lived access (15min), blacklist on logout
- [ ] **Service auth** — AI→Backend uses API key, not user JWT tokens
- [ ] **Helmet.js** — Enabled on Express (CSP, HSTS, etc.)
- [ ] **No `server_tokens`** — Nginx `server_tokens off;`

### Docker Security

- [ ] **Pinned base images** — `node:20-alpine`, `python:3.10-slim`, `nginx:1.27-alpine`
- [ ] **Multi-stage builds** — No build tools/compilers in production images
- [ ] **No `--privileged`** — No containers run privileged
- [ ] **Resource limits** — CPU and memory limits on all containers
- [ ] **Docker socket not mounted** — Never mount `/var/run/docker.sock`
- [ ] **Image scanning** — Run `docker scout cves` or Trivy before deploying
- [ ] **Container labels** — OCI labels for image identification

### Monitoring & Alerting

- [ ] **Health checks active** — All 6 services have Docker HEALTHCHECK
- [ ] **Log rotation configured** — Docker `json-file` driver with max-size/max-file
- [ ] **Uptime monitoring** — External service pinging `/health` every 60s
- [ ] **Error alerting** — Alert on 5xx spike, container restart, disk full
- [ ] **Disk usage monitoring** — Docker volumes, PostgreSQL data, log dirs
- [ ] **Backup scheduled** — `deploy/scripts/backup.sh` via cron (daily at 2am)
- [ ] **Backup tested** — Verify restore procedure quarterly

### Data Protection

- [ ] **Database backups** — Daily automated, 30-day retention
- [ ] **Encryption at rest** — PostgreSQL tablespace encryption or LUKS on volume
- [ ] **PII handling** — Plate numbers and owner data: access-controlled, audit-logged
- [ ] **Data retention** — Auto-purge tracking_points older than 90 days
- [ ] **GDPR/privacy** — Document what personal data is collected and retention period

---

## Maintenance Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f ai-service --tail=100

# Restart a single service
docker compose -f docker-compose.prod.yml restart app

# Scale backend to 3 instances
docker compose -f docker-compose.prod.yml up -d --scale app=3

# Run database migration
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U traffic_app -d traffic_control -f /docker-entrypoint-initdb.d/02-integration.sql

# Connect to database
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U traffic_app -d traffic_control

# Redis CLI
docker compose -f docker-compose.prod.yml exec redis \
  redis-cli -a "$REDIS_PASSWORD"

# Force rebuild single service
docker compose -f docker-compose.prod.yml build --no-cache app
docker compose -f docker-compose.prod.yml up -d app

# Full stop
docker compose -f docker-compose.prod.yml down

# Stop and remove volumes (DESTRUCTIVE)
docker compose -f docker-compose.prod.yml down -v
```

---

## Disaster Recovery

| Scenario | Recovery |
|---|---|
| Backend crash | Auto-restart (`restart: always`), health check triggers restart |
| AI service OOM | Container restart; increase memory limit |
| Database corruption | Restore from backup: `pg_restore -U postgres -d traffic_control backup.sql.gz` |
| Redis data loss | Acceptable (cache/pub-sub); data reconstructed from PostgreSQL |
| Full disk | Purge logs: `docker system prune`; expand volume |
| TLS cert expiry | Certbot auto-renewal cron; manual: `certbot renew` |
| Secret compromise | Rotate secrets in `.env`, restart all services |
