# Autonomous Traffic Light Control System

Production-grade Node.js backend built with TypeScript for managing autonomous traffic signals, vehicle tracking, violation detection, and real-time alerts.

## Tech Stack

- **Runtime:** Node.js 20+ / TypeScript 5.6
- **Framework:** Express.js with Helmet security
- **Database:** PostgreSQL 16 with PostGIS 3.4
- **Cache/PubSub:** Redis 7
- **Real-time:** Socket.io (WebSocket)
- **Auth:** JWT access + refresh tokens
- **Validation:** Zod schemas
- **Logging:** Winston (file + console)
- **Containerization:** Docker + Docker Compose

## Architecture

```
src/
├── config/          # App config, Redis client
├── common/          # Logger, errors, response helpers
├── database/        # PostgreSQL connection, schema, migrations, seeds
├── middleware/       # Auth, RBAC, validation middleware
├── modules/
│   ├── auth/        # Registration, login, JWT, refresh tokens
│   ├── vehicles/    # Vehicle CRUD, blacklist management
│   ├── violations/  # Violation tracking, review workflow
│   ├── tracking/    # Real-time GPS tracking with PostGIS
│   ├── alerts/      # Alert system with priorities
│   └── traffic-signals/  # Signal control, state management, scheduling
├── routes/          # API v1 router, health checks
├── websocket/       # Socket.io setup with Redis pub/sub
├── app.ts           # Express app configuration
└── server.ts        # Server bootstrap, graceful shutdown
```

## Quick Start

### With Docker (recommended)

```bash
docker-compose up -d
```

This starts PostgreSQL (PostGIS), Redis, and the application.

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start PostgreSQL and Redis** (or use Docker for infra only):
   ```bash
   docker-compose up -d postgres redis
   ```

3. **Configure environment** - copy `.env.example` to `.env` and update values.

4. **Run migrations:**
   ```bash
   npm run migrate
   ```

5. **Seed database:**
   ```bash
   npm run seed
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

Server starts at `http://localhost:3000`.

## Default Credentials (after seeding)

| Role    | Email                          | Password       |
|---------|--------------------------------|----------------|
| Admin   | admin@trafficcontrol.gov       | Admin@123456   |
| Police  | officer@trafficcontrol.gov     | Police@123456  |
| Analyst | analyst@trafficcontrol.gov     | Analyst@123456 |

## API Endpoints

Base URL: `/api/v1`

### Auth
| Method | Endpoint                  | Auth | Roles |
|--------|---------------------------|------|-------|
| POST   | /auth/register            | No   | -     |
| POST   | /auth/login               | No   | -     |
| POST   | /auth/refresh             | No   | -     |
| POST   | /auth/logout              | Yes  | All   |
| POST   | /auth/change-password     | Yes  | All   |
| GET    | /auth/profile             | Yes  | All   |

### Vehicles
| Method | Endpoint                          | Auth | Roles              |
|--------|-----------------------------------|------|--------------------|
| POST   | /vehicles                         | Yes  | Admin, Police      |
| GET    | /vehicles                         | Yes  | All                |
| GET    | /vehicles/:id                     | Yes  | All                |
| GET    | /vehicles/plate/:plateNumber      | Yes  | Admin, Police      |
| PATCH  | /vehicles/:id                     | Yes  | Admin, Police      |
| DELETE | /vehicles/:id                     | Yes  | Admin              |

### Violations
| Method | Endpoint                   | Auth | Roles              |
|--------|----------------------------|------|--------------------|
| POST   | /violations                | Yes  | Admin, Police      |
| GET    | /violations                | Yes  | All                |
| GET    | /violations/stats          | Yes  | Admin, Analyst     |
| GET    | /violations/:id            | Yes  | All                |
| PATCH  | /violations/:id            | Yes  | Admin, Police      |

### Tracking
| Method | Endpoint                   | Auth | Roles              |
|--------|----------------------------|------|--------------------|
| POST   | /tracking                  | Yes  | Admin, Police      |
| POST   | /tracking/batch            | Yes  | Admin, Police      |
| GET    | /tracking/history          | Yes  | All                |
| GET    | /tracking/latest           | Yes  | All                |
| GET    | /tracking/geofence         | Yes  | Admin, Police      |

### Alerts
| Method | Endpoint                   | Auth | Roles              |
|--------|----------------------------|------|--------------------|
| POST   | /alerts                    | Yes  | Admin, Police      |
| GET    | /alerts                    | Yes  | All                |
| GET    | /alerts/active-count       | Yes  | All                |
| GET    | /alerts/:id                | Yes  | All                |
| PATCH  | /alerts/:id                | Yes  | Admin, Police      |

### Traffic Signals
| Method | Endpoint                          | Auth | Roles              |
|--------|-----------------------------------|------|--------------------|
| POST   | /signals                          | Yes  | Admin              |
| GET    | /signals                          | Yes  | All                |
| GET    | /signals/group/:groupId           | Yes  | All                |
| GET    | /signals/:id                      | Yes  | All                |
| PATCH  | /signals/:id                      | Yes  | Admin              |
| POST   | /signals/:id/state                | Yes  | Admin, Police      |
| GET    | /signals/:id/log                  | Yes  | All                |
| POST   | /signals/:id/schedule             | Yes  | Admin              |
| GET    | /signals/:id/schedules            | Yes  | All                |
| DELETE | /signals/:id                      | Yes  | Admin              |

### Health
| Method | Endpoint | Description            |
|--------|----------|------------------------|
| GET    | /health  | Full health check      |
| GET    | /ready   | Readiness probe        |

## WebSocket Events

Connect with a valid JWT token:
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-access-token' }
});
```

### Server → Client Events
| Event                  | Room      | Description                    |
|------------------------|-----------|--------------------------------|
| `violation:new`        | alerts    | New violation detected         |
| `alert:new`            | alerts    | New alert created              |
| `alert:critical`       | all       | Critical alert broadcast       |
| `alert:update`         | alerts    | Alert status changed           |
| `tracking:update`      | tracking  | Vehicle position update        |
| `vehicle:position`     | vehicle:* | Specific vehicle position      |
| `signal:state-change`  | signals   | Traffic signal state changed   |

### Client → Server Events
| Event                | Payload    | Description                |
|----------------------|------------|----------------------------|
| `join:signal-group`  | groupId    | Subscribe to signal group  |
| `leave:signal-group` | groupId    | Unsubscribe from group     |
| `track:vehicle`      | vehicleId  | Track specific vehicle     |
| `untrack:vehicle`    | vehicleId  | Stop tracking vehicle      |

## License

MIT
