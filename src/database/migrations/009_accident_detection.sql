-- Migration 009: Accident Detection
-- Adds accidents table for tracking detected accidents with GPS, severity, and notification status

CREATE TABLE IF NOT EXISTS accidents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Detection metadata
    detection_type  VARCHAR(30) NOT NULL CHECK (detection_type IN ('sudden_stop', 'collision', 'unusual_motion', 'manual_report')),
    severity        VARCHAR(10) NOT NULL DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status          VARCHAR(20) NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'confirmed', 'dispatched', 'resolved', 'false_alarm')),

    -- Location
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,

    -- Description & evidence
    description     TEXT,
    evidence_url    VARCHAR(500),

    -- Vehicles involved (array of vehicle IDs)
    vehicle_ids     UUID[] DEFAULT '{}',

    -- Detection data (raw telemetry that triggered the detection)
    detection_data  JSONB DEFAULT '{}',

    -- Notifications
    police_notified     BOOLEAN NOT NULL DEFAULT false,
    hospital_notified   BOOLEAN NOT NULL DEFAULT false,
    police_notified_at  TIMESTAMPTZ,
    hospital_notified_at TIMESTAMPTZ,

    -- Linked alert (auto-created in alerts table)
    alert_id        UUID REFERENCES alerts(id) ON DELETE SET NULL,

    -- Responder
    responded_by    UUID REFERENCES users(id),
    responded_at    TIMESTAMPTZ,
    resolution_notes TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accidents_status ON accidents(status);
CREATE INDEX IF NOT EXISTS idx_accidents_severity ON accidents(severity);
CREATE INDEX IF NOT EXISTS idx_accidents_detection_type ON accidents(detection_type);
CREATE INDEX IF NOT EXISTS idx_accidents_created_at ON accidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accidents_location ON accidents(latitude, longitude);

-- Done
