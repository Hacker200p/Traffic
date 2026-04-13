-- Migration 010: Align challan status constraint with approval workflow
-- Adds pending_approval and rejected to allowed status values.

ALTER TABLE challans DROP CONSTRAINT IF EXISTS challans_status_check;

ALTER TABLE challans
ADD CONSTRAINT challans_status_check
CHECK (
  status IN (
    'pending_approval',
    'issued',
    'sent',
    'paid',
    'overdue',
    'rejected',
    'cancelled'
  )
);
