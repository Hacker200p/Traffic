-- =============================================================================
-- Migration 002: Integration updates for AI microservice
-- =============================================================================
-- 1. Make violations.vehicle_id nullable (AI may detect violations without
--    knowing the vehicle UUID — e.g. helmet violations without plates).
-- 2. Add 'no_helmet' to the violation type CHECK constraint.
-- 3. Add an index on vehicles.plate_number for fast AI plate lookups.
-- =============================================================================

BEGIN;

-- ── 1. Make vehicle_id nullable on violations ───────────────────────────────
ALTER TABLE violations
  ALTER COLUMN vehicle_id DROP NOT NULL;

-- ── 2. Expand violation type CHECK to include no_helmet ─────────────────────
ALTER TABLE violations
  DROP CONSTRAINT IF EXISTS violations_type_check;

ALTER TABLE violations
  ADD CONSTRAINT violations_type_check
  CHECK (type IN (
    'red_light', 'speeding', 'wrong_way', 'illegal_parking',
    'no_seatbelt', 'illegal_turn', 'no_helmet', 'other'
  ));

-- ── 3. Index for plate-number lookups used by integration service ───────────
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number
  ON vehicles (plate_number);

-- ── 4. Index for faster violation queries by type + created_at ──────────────
CREATE INDEX IF NOT EXISTS idx_violations_type_created
  ON violations (type, created_at DESC);

-- ── 5. Ensure signal_state_log.changed_by can accept the system user id ─────
-- (The AI integration uses a synthetic system user UUID. If the FK already
--  exists and the value is a valid UUID it will just work.)

COMMIT;
