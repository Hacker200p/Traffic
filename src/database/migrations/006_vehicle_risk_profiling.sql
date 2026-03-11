-- 006: Vehicle Risk Profiling
-- Adds risk scoring columns to vehicles table and a risk_history audit log

ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS risk_score        DECIMAL(4,1) DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS risk_rating       VARCHAR(20)  DEFAULT 'low',
    ADD COLUMN IF NOT EXISTS violation_count   INTEGER      DEFAULT 0,
    ADD COLUMN IF NOT EXISTS overspeed_count   INTEGER      DEFAULT 0,
    ADD COLUMN IF NOT EXISTS risk_updated_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vehicles_risk_score  ON vehicles (risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_risk_rating ON vehicles (risk_rating);

CREATE TABLE IF NOT EXISTS vehicle_risk_history (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id    UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    risk_score    DECIMAL(4,1) NOT NULL,
    risk_rating   VARCHAR(20)  NOT NULL,
    factors       JSONB        NOT NULL DEFAULT '{}',
    calculated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_history_vehicle ON vehicle_risk_history (vehicle_id, calculated_at DESC);
