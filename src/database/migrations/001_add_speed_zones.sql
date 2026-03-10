-- Migration: 001_add_vehicle_speed_zones
-- Description: Add speed zone support for autonomous signal control

CREATE TABLE IF NOT EXISTS speed_zones (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name              VARCHAR(200) NOT NULL,
    boundary_json   TEXT NOT NULL,
    speed_limit       DECIMAL(6,2) NOT NULL,
    is_school_zone    BOOLEAN DEFAULT FALSE,
    active_start_time TIME,
    active_end_time   TIME,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Boundary index not applicable without PostGIS
-- CREATE INDEX idx_speed_zones_boundary ON speed_zones USING GIST(boundary);

-- Add a column to tracking_points to reference speed zones
ALTER TABLE tracking_points ADD COLUMN IF NOT EXISTS speed_zone_id UUID REFERENCES speed_zones(id) ON DELETE SET NULL;

-- Add vehicle last known position for faster lookups
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_known_latitude DOUBLE PRECISION;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_known_longitude DOUBLE PRECISION;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
