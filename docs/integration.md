# Integration Guide — AI Service ↔ Backend ↔ Frontend

This document describes how the three services connect end-to-end:

```
┌─────────────┐   HTTP/JSON    ┌──────────────┐   Redis Pub/Sub   ┌──────────────┐
│  AI Service  │ ─────────────→ │   Backend    │ ────────────────→ │  WebSocket   │
│  (FastAPI)   │   POST /api/v1 │  (Express)   │                   │   Layer      │
│              │   /integration │              │                   │ (Socket.io)  │
└─────────────┘                 └──────┬───────┘                   └──────┬───────┘
                                       │ PostgreSQL + PostGIS             │ Socket.io
                                       ▼                                  ▼
                                ┌──────────────┐                   ┌──────────────┐
                                │  PostgreSQL   │                   │   Frontend   │
                                │ + PostGIS     │                   │  (React)     │
                                └──────────────┘                   └──────────────┘
```

---

## 1. Authentication (Service-to-Service)

The AI microservice authenticates using a **shared API key**, not JWT tokens.

| Header            | Value                                  |
|-------------------|----------------------------------------|
| `Authorization`   | `Bearer <SERVICE_API_KEY>`             |
| `X-Source`        | `ai-service`                           |
| `Content-Type`    | `application/json`                     |

The backend `serviceAuth` middleware validates the key and injects a synthetic
system user (`req.user`) so downstream services work normally.

**Config (.env):**
```env
# Backend
SERVICE_API_KEY=my-shared-secret-key-at-least-32-chars
SERVICE_SYSTEM_USER_ID=00000000-0000-0000-0000-000000000001

# AI Service
BACKEND_API_KEY=my-shared-secret-key-at-least-32-chars   # must match backend
BACKEND_API_URL=http://app:3000/api/v1                    # Docker service name
```

---

## 2. Integration Endpoints

All AI → Backend calls use the `/api/v1/integration/*` prefix.

| Endpoint                                  | Method | Description                    |
|------------------------------------------|--------|--------------------------------|
| `/api/v1/integration/health`             | GET    | Connectivity check             |
| `/api/v1/integration/violations`         | POST   | Ingest AI-detected violation   |
| `/api/v1/integration/tracking`           | POST   | Single tracking point          |
| `/api/v1/integration/tracking/batch`     | POST   | Batch tracking points          |
| `/api/v1/integration/alerts`             | POST   | Create AI-generated alert      |
| `/api/v1/integration/signals/:id/state`  | POST   | Update signal from AI density  |

---

## 3. JSON Payload Examples

### 3.1 Violation — Helmet Detection

```json
POST /api/v1/integration/violations
{
  "type": "no_helmet",
  "description": "Rider without helmet detected (conf=0.87)",
  "latitude": 36.7525,
  "longitude": 3.0420,
  "severity": "medium",
  "signal_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 3.2 Violation — Red-Light with Plate

```json
POST /api/v1/integration/violations
{
  "type": "red_light",
  "description": "Vehicle (car) crossed stop line on red (conf=0.92)",
  "latitude": 36.7525,
  "longitude": 3.0420,
  "severity": "high",
  "signal_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "plate_text": "12345-200-16"
}
```

**Backend behavior:**
- If `plate_text` is provided → looks up `vehicles` table by `plate_number`
- If not found → auto-registers the vehicle (type=`unknown`)
- If vehicle is blacklisted → logs a warning
- If severity is `high` or `critical` → auto-creates an alert

### 3.3 Tracking Point

```json
POST /api/v1/integration/tracking
{
  "vehicle_id": "550e8400-e29b-41d4-a716-446655440000",
  "latitude": 36.7530,
  "longitude": 3.0425,
  "speed": 45.2,
  "heading": 180.0,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 3.4 Alert

```json
POST /api/v1/integration/alerts
{
  "type": "congestion",
  "priority": "high",
  "title": "Heavy congestion detected on Route N5",
  "description": "AI density analysis: 42 vehicles, occupancy 85%",
  "latitude": 36.7525,
  "longitude": 3.0420,
  "signal_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 3.5 Signal State Update (from Density Analysis)

```json
POST /api/v1/integration/signals/a1b2c3d4-e5f6-7890-abcd-ef1234567890/state
{
  "state": "green",
  "duration": 45,
  "reason": "AI density: high (28 vehicles, occupancy 72.3%)"
}
```

---

## 4. PostGIS Insert Queries

### 4.1 Violation Insert

```sql
INSERT INTO violations
  (id, vehicle_id, type, description, location, speed, speed_limit,
   evidence_url, signal_id, severity, fine_amount, status, created_at, updated_at)
VALUES
  ($1, $2, $3, $4,
   ST_SetSRID(ST_MakePoint($5 /* longitude */, $6 /* latitude */), 4326),
   $7, $8, $9, $10, $11, $12, 'pending', NOW(), NOW())
RETURNING id, vehicle_id, type, description,
          ST_X(location::geometry) as longitude,
          ST_Y(location::geometry) as latitude,
          speed, speed_limit, evidence_url, signal_id,
          severity, fine_amount, status, created_at;
```

### 4.2 Tracking Point Insert

```sql
INSERT INTO tracking_points
  (id, vehicle_id, location, speed, heading, accuracy, recorded_at, created_at)
VALUES
  ($1, $2,
   ST_SetSRID(ST_MakePoint($3 /* longitude */, $4 /* latitude */), 4326),
   $5, $6, $7, COALESCE($8::timestamptz, NOW()), NOW())
RETURNING id, vehicle_id,
          ST_X(location::geometry) as longitude,
          ST_Y(location::geometry) as latitude,
          speed, heading, accuracy, recorded_at;
```

### 4.3 Alert Insert

```sql
INSERT INTO alerts
  (id, type, priority, title, description, location, radius,
   vehicle_id, signal_id, status, created_by, expires_at, created_at, updated_at)
VALUES
  ($1, $2, $3, $4, $5,
   ST_SetSRID(ST_MakePoint($6 /* longitude */, $7 /* latitude */), 4326),
   $8, $9, $10, 'active', $11, $12::timestamptz, NOW(), NOW())
RETURNING id, type, priority, title, description,
          ST_X(location::geometry) as longitude,
          ST_Y(location::geometry) as latitude,
          radius, vehicle_id, signal_id, status, created_by, expires_at, created_at;
```

---

## 5. Redis Pub/Sub Pipeline

After every database write, the backend service publishes to a Redis channel:

| Write operation              | Redis channel         | Published data                         |
|-----------------------------|-----------------------|---------------------------------------|
| Violation created           | `violations:new`      | Full violation row (JSON)              |
| Alert created               | `alerts:new`          | Full alert row (JSON)                  |
| Alert updated               | `alerts:update`       | Updated alert row (JSON)               |
| Tracking point recorded     | `tracking:update`     | Tracking point row (JSON)              |
| Signal state changed        | `signals:state-change`| `{signalId, previousState, newState, changedBy, reason, timestamp}` |

### Redis Publish Example (TypeScript)

```typescript
// In violations.service.ts → create()
const violation = result.rows[0];
await redis.publish('violations:new', JSON.stringify(violation));

// In alerts.service.ts → create()
const alert = result.rows[0];
await redis.publish('alerts:new', JSON.stringify(alert));

// In tracking.service.ts → recordPoint()
const point = result.rows[0];
await redis.publish('tracking:update', JSON.stringify(point));

// In signals.service.ts → changeState()
await redis.publish('signals:state-change', JSON.stringify({
  signalId: id,
  previousState: signal.current_state,
  newState: input.state,
  changedBy,
  reason: input.reason,
  timestamp: new Date().toISOString(),
}));
```

---

## 6. WebSocket Broadcast Logic

The WebSocket layer (`src/websocket/index.ts`) subscribes to Redis channels and
emits Socket.io events to the appropriate rooms:

```
Redis Channel          →  Socket.io Event    →  Room           →  Frontend Handler
─────────────────────────────────────────────────────────────────────────────────
violations:new         →  violation:new       →  alerts         →  addViolation()
alerts:new             →  alert:new           →  alerts         →  addAlert()
alerts:update          →  alert:update        →  alerts         →  (update alert)
tracking:update        →  vehicle:update      →  tracking       →  updateLivePosition()
signals:state-change   →  signal:update       →  signals        →  updateSignal()
```

### Event Payload Shapes (emitted by backend)

**`violation:new`**
```json
{
  "violation": {
    "id": "uuid",
    "vehicle_id": "uuid | null",
    "type": "red_light",
    "description": "...",
    "longitude": 3.042,
    "latitude": 36.752,
    "severity": "high",
    "status": "pending",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**`alert:new`**
```json
{
  "alert": {
    "id": "uuid",
    "type": "congestion",
    "priority": "high",
    "title": "Heavy congestion",
    "description": "...",
    "longitude": 3.042,
    "latitude": 36.752,
    "status": "active",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**`vehicle:update`**
```json
{
  "vehicleId": "uuid",
  "location": { "latitude": 36.753, "longitude": 3.042 },
  "speed": 45.2,
  "heading": 180.0,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**`signal:update`**
```json
{
  "signalId": "uuid",
  "state": "green",
  "remainingSeconds": 45,
  "previousState": "red",
  "reason": "AI density adjustment",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 7. Frontend Real-Time Listener

The `useWebSocket` hook (`frontend/src/hooks/useWebSocket.ts`) subscribes to
all events and dispatches Redux actions:

```typescript
socket.on('vehicle:update', (data: WsVehicleUpdate) => {
  dispatch(updateLivePosition({
    id: '',
    vehicleId: data.vehicleId,
    location: data.location,
    speed: data.speed,
    heading: data.heading,
    timestamp: data.timestamp,
  }));
});

socket.on('signal:update', (data: WsSignalUpdate) => {
  dispatch(updateSignal({
    id: data.signalId,
    state: data.state,
    remainingSeconds: data.remainingSeconds,
  }));
});

socket.on('alert:new', (data: WsAlertEvent) => {
  dispatch(addAlert(data.alert));
  if (data.alert.priority === 'critical') {
    toast.error(data.alert.title, { duration: 6000 });
  }
});

socket.on('violation:new', (data: WsViolationEvent) => {
  dispatch(addViolation(data.violation));
});
```

---

## 8. Complete Data Flow Example

**Scenario: AI detects a red-light violation**

```
1. Camera captures frame
   ↓
2. AI Service: POST /api/v1/integration/violations
   {
     "type": "red_light",
     "description": "Vehicle (car) crossed stop line on red",
     "latitude": 36.7525,
     "longitude": 3.0420,
     "severity": "high",
     "plate_text": "12345-200-16"
   }
   ↓
3. Backend: serviceAuth middleware validates API key ✓
   ↓
4. Backend: IntegrationService.ingestViolation()
   - Looks up vehicle by plate "12345-200-16" → found (or auto-registers)
   - INSERT INTO violations ... ST_SetSRID(ST_MakePoint(3.042, 36.752), 4326)
   - redis.publish('violations:new', JSON.stringify(violation))
   - severity=high → auto-creates alert
   - redis.publish('alerts:new', JSON.stringify(alert))
   ↓
5. WebSocket layer (Redis subscriber picks up):
   - violations:new → io.to('alerts').emit('violation:new', { violation })
   - alerts:new → io.to('alerts').emit('alert:new', { alert })
   ↓
6. Frontend useWebSocket hook:
   - violation:new → dispatch(addViolation(violation)) → UI updates
   - alert:new → dispatch(addAlert(alert)) → toast notification
   ↓
7. Map marker appears on dashboard with violation details
```

---

## 9. Database Migration

Run the migration before starting the integrated stack:

```bash
psql -U postgres -d traffic_control -f src/database/migrations/002_integration_updates.sql
```

Changes:
- `violations.vehicle_id` → nullable (allows AI violations without known vehicle)
- Added `no_helmet` to violation type CHECK constraint
- Added index on `vehicles.plate_number` for fast AI plate lookups
- Added compound index on `violations(type, created_at)`

---

## 10. Docker Compose Environment

Ensure both services share the same API key in `docker-compose.yml`:

```yaml
services:
  app:
    environment:
      SERVICE_API_KEY: ${SERVICE_API_KEY}
      SERVICE_SYSTEM_USER_ID: "00000000-0000-0000-0000-000000000001"

  ai-service:
    environment:
      BACKEND_API_URL: http://app:3000/api/v1
      BACKEND_API_KEY: ${SERVICE_API_KEY}
```
