-- Migration: 003_add_challans_table
-- Description: Add e-challan system for automated fine generation and notification tracking

-- ── Challans table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challan_number  VARCHAR(30) UNIQUE NOT NULL,
    violation_id    UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
    vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    plate_number    VARCHAR(20) NOT NULL,
    owner_name      VARCHAR(200),
    owner_contact   VARCHAR(100),
    violation_type  VARCHAR(30) NOT NULL,
    fine_amount     DECIMAL(10,2) NOT NULL,
    due_date        TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'sent', 'paid', 'overdue', 'cancelled')),
    payment_date    TIMESTAMPTZ,
    payment_ref     VARCHAR(200),
    notification_channels TEXT[] DEFAULT '{}',
    notification_sent_at  TIMESTAMPTZ,
    notification_status   VARCHAR(20) DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'failed', 'delivered')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challans_violation ON challans(violation_id);
CREATE INDEX IF NOT EXISTS idx_challans_vehicle ON challans(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_challans_plate ON challans(plate_number);
CREATE INDEX IF NOT EXISTS idx_challans_status ON challans(status);
CREATE INDEX IF NOT EXISTS idx_challans_due_date ON challans(due_date);
CREATE INDEX IF NOT EXISTS idx_challans_number ON challans(challan_number);

-- Update violations table to track challan linkage
ALTER TABLE violations ADD COLUMN IF NOT EXISTS challan_id UUID REFERENCES challans(id) ON DELETE SET NULL;
