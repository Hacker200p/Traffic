-- ============================================
-- Migration 005: Real-Time Alert System
-- Adds restricted zones, notification prefs,
-- notification log, and extended alert types
-- ============================================

-- 1. Extend alert type enum to include restricted_zone and violation
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_type_check
  CHECK (type IN (
    'accident', 'congestion', 'signal_malfunction', 'blacklisted_vehicle',
    'emergency', 'road_closure', 'weather', 'restricted_zone', 'violation', 'other'
  ));

-- 2. Restricted zones (circular geofences)
CREATE TABLE IF NOT EXISTS restricted_zones (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    radius      DECIMAL(10,2) NOT NULL,               -- metres
    zone_type   VARCHAR(30) NOT NULL DEFAULT 'restricted'
                CHECK (zone_type IN ('restricted', 'no_entry', 'vip', 'school', 'hospital')),
    is_active   BOOLEAN DEFAULT TRUE,
    start_time  TIME,                                  -- NULL = always active
    end_time    TIME,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_restricted_zones_active ON restricted_zones(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_restricted_zones_location ON restricted_zones(latitude, longitude);

-- 3. Per-user notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type  VARCHAR(30) NOT NULL,
    sms         BOOLEAN DEFAULT FALSE,
    push        BOOLEAN DEFAULT TRUE,
    email       BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, alert_type)
);

CREATE INDEX idx_notif_prefs_user ON notification_preferences(user_id);
CREATE INDEX idx_notif_prefs_type ON notification_preferences(alert_type);

-- 4. Notification delivery log (audit trail)
CREATE TABLE IF NOT EXISTS notification_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id    UUID REFERENCES alerts(id) ON DELETE SET NULL,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    channel     VARCHAR(10) NOT NULL CHECK (channel IN ('sms', 'push', 'email', 'dashboard')),
    status      VARCHAR(10) NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
    recipient   VARCHAR(255),
    error       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_log_alert ON notification_log(alert_id);
CREATE INDEX idx_notif_log_user ON notification_log(user_id);
CREATE INDEX idx_notif_log_time ON notification_log(created_at);

-- 5. Add phone_number column to users (for SMS)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
