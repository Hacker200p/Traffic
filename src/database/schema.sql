-- ============================================
-- Autonomous Traffic Light Control System
-- Full Database Schema with PostGIS
-- ============================================

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'police', 'analyst')),
    badge_number    VARCHAR(50),
    department      VARCHAR(200),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- Vehicles table
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate_number    VARCHAR(20) UNIQUE NOT NULL,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('car', 'truck', 'motorcycle', 'bus', 'emergency', 'bicycle')),
    make            VARCHAR(100),
    model           VARCHAR(100),
    color           VARCHAR(50),
    year            INTEGER,
    owner_name      VARCHAR(200),
    owner_contact   VARCHAR(100),
    is_blacklisted  BOOLEAN DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX idx_vehicles_type ON vehicles(type);
CREATE INDEX idx_vehicles_blacklisted ON vehicles(is_blacklisted) WHERE is_blacklisted = TRUE;

-- ============================================
-- Signal Groups (intersection grouping)
-- ============================================
CREATE TABLE IF NOT EXISTS signal_groups (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    intersection_name VARCHAR(300),
    location        GEOGRAPHY(POINT, 4326),
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Traffic Signals table
-- ============================================
CREATE TABLE IF NOT EXISTS traffic_signals (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                    VARCHAR(200) NOT NULL,
    intersection_name       VARCHAR(300),
    location                GEOGRAPHY(POINT, 4326) NOT NULL,
    direction               VARCHAR(20) NOT NULL CHECK (direction IN ('north', 'south', 'east', 'west', 'north_east', 'north_west', 'south_east', 'south_west')),
    type                    VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'pedestrian', 'arrow', 'flashing', 'emergency')),
    default_green_duration  INTEGER NOT NULL DEFAULT 30,
    default_yellow_duration INTEGER NOT NULL DEFAULT 5,
    default_red_duration    INTEGER NOT NULL DEFAULT 30,
    is_autonomous           BOOLEAN DEFAULT TRUE,
    group_id                UUID REFERENCES signal_groups(id) ON DELETE SET NULL,
    camera_url              VARCHAR(500),
    current_state           VARCHAR(20) NOT NULL DEFAULT 'red' CHECK (current_state IN ('green', 'yellow', 'red', 'flashing_red', 'flashing_yellow', 'off')),
    last_state_change       TIMESTAMPTZ DEFAULT NOW(),
    override_until          TIMESTAMPTZ,
    is_online               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signals_location ON traffic_signals USING GIST(location);
CREATE INDEX idx_signals_group ON traffic_signals(group_id);
CREATE INDEX idx_signals_state ON traffic_signals(current_state);
CREATE INDEX idx_signals_type ON traffic_signals(type);

-- ============================================
-- Signal State Log (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS signal_state_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id       UUID NOT NULL REFERENCES traffic_signals(id) ON DELETE CASCADE,
    previous_state  VARCHAR(20) NOT NULL,
    new_state       VARCHAR(20) NOT NULL,
    changed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    reason          VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signal_log_signal ON signal_state_log(signal_id);
CREATE INDEX idx_signal_log_time ON signal_state_log(created_at);

-- ============================================
-- Signal Schedules table
-- ============================================
CREATE TABLE IF NOT EXISTS signal_schedules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id       UUID NOT NULL REFERENCES traffic_signals(id) ON DELETE CASCADE,
    day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    green_duration  INTEGER NOT NULL,
    yellow_duration INTEGER NOT NULL,
    red_duration    INTEGER NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedules_signal ON signal_schedules(signal_id);

-- ============================================
-- Tracking Points table (vehicle GPS data)
-- ============================================
CREATE TABLE IF NOT EXISTS tracking_points (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    speed           DECIMAL(6,2),
    heading         DECIMAL(5,2),
    accuracy        DECIMAL(8,2),
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_vehicle ON tracking_points(vehicle_id);
CREATE INDEX idx_tracking_time ON tracking_points(recorded_at);
CREATE INDEX idx_tracking_location ON tracking_points USING GIST(location);
-- Composite index for recent positions per vehicle
CREATE INDEX idx_tracking_vehicle_time ON tracking_points(vehicle_id, recorded_at DESC);

-- ============================================
-- Violations table
-- ============================================
CREATE TABLE IF NOT EXISTS violations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    type            VARCHAR(30) NOT NULL CHECK (type IN ('red_light', 'speeding', 'wrong_way', 'illegal_parking', 'no_seatbelt', 'illegal_turn', 'other')),
    description     TEXT,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    speed           DECIMAL(6,2),
    speed_limit     DECIMAL(6,2),
    evidence_url    VARCHAR(500),
    signal_id       UUID REFERENCES traffic_signals(id) ON DELETE SET NULL,
    severity        VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    fine_amount     DECIMAL(10,2),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'confirmed', 'dismissed', 'appealed')),
    reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    review_notes    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_violations_vehicle ON violations(vehicle_id);
CREATE INDEX idx_violations_type ON violations(type);
CREATE INDEX idx_violations_status ON violations(status);
CREATE INDEX idx_violations_severity ON violations(severity);
CREATE INDEX idx_violations_location ON violations USING GIST(location);
CREATE INDEX idx_violations_time ON violations(created_at);
CREATE INDEX idx_violations_signal ON violations(signal_id);

-- ============================================
-- Alerts table
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type            VARCHAR(30) NOT NULL CHECK (type IN ('accident', 'congestion', 'signal_malfunction', 'blacklisted_vehicle', 'emergency', 'road_closure', 'weather', 'other')),
    priority        VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    radius          DECIMAL(10,2),
    vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    signal_id       UUID REFERENCES traffic_signals(id) ON DELETE SET NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'expired')),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_notes  TEXT,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_priority ON alerts(priority);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_location ON alerts USING GIST(location);
CREATE INDEX idx_alerts_active ON alerts(status, expires_at) WHERE status = 'active';

-- ============================================
-- Migrations tracking table
-- ============================================
CREATE TABLE IF NOT EXISTS migrations (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) UNIQUE NOT NULL,
    executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
