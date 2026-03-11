-- Migration 007: Challan approval workflow
-- Adds approval tracking columns and updates status constraints

-- Add approval columns
ALTER TABLE challans ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE challans ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE challans ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Update existing 'issued' challans to keep their status (backward compat)
-- New challans will start as 'pending_approval'
