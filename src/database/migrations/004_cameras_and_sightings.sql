-- ============================================
-- 004: Cameras + Vehicle Sightings
-- Track vehicle movement across cameras
-- ============================================

-- Cameras table — physical camera installations
CREATE TABLE IF NOT EXISTS cameras (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    intersection_name VARCHAR(300),
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    camera_type     VARCHAR(20) NOT NULL DEFAULT 'fixed' CHECK (camera_type IN ('fixed', 'dome', 'ptz', 'anpr')),
    stream_url      VARCHAR(500),
    signal_id       UUID REFERENCES traffic_signals(id) ON DELETE SET NULL,
    is_online       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cameras_location ON cameras(latitude, longitude);
CREATE INDEX idx_cameras_signal ON cameras(signal_id);

-- Vehicle sightings — each time a camera recognises a vehicle
CREATE TABLE IF NOT EXISTS vehicle_sightings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id      UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    camera_id       UUID REFERENCES cameras(id) ON DELETE SET NULL,
    plate_text      VARCHAR(20) NOT NULL,
    confidence      DECIMAL(5,4),
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    speed           DECIMAL(6,2),
    heading         DECIMAL(5,2),
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sightings_vehicle ON vehicle_sightings(vehicle_id);
CREATE INDEX idx_sightings_camera ON vehicle_sightings(camera_id);
CREATE INDEX idx_sightings_plate ON vehicle_sightings(plate_text);
CREATE INDEX idx_sightings_time ON vehicle_sightings(detected_at);
CREATE INDEX idx_sightings_vehicle_time ON vehicle_sightings(vehicle_id, detected_at DESC);

-- Add camera_id to tracking_points for camera-sourced GPS data
ALTER TABLE tracking_points ADD COLUMN IF NOT EXISTS camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL;
ALTER TABLE tracking_points ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'gps' CHECK (source_type IN ('gps', 'camera', 'plate_reading'));
