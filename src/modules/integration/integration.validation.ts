import { z } from 'zod';

// ── Violation from AI (relaxed: no vehicleId required, accepts snake_case) ──
export const aiViolationSchema = z.object({
  type: z.enum([
    'red_light', 'speeding', 'wrong_way', 'illegal_parking',
    'no_seatbelt', 'illegal_turn', 'no_helmet', 'other',
  ]),
  description: z.string().max(1000).optional().default(''),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().positive().optional(),
  speed_limit: z.number().positive().optional(),
  evidence_url: z.string().url().optional(),
  signal_id: z.string().optional(), // may not be a UUID from AI
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  fine_amount: z.number().positive().optional(),
  plate_text: z.string().max(20).optional(),
  camera_id: z.string().optional(),
});

// ── Tracking point from AI ──────────────────────────────────────────────────
export const aiTrackingSchema = z.object({
  vehicle_id: z.string().uuid('Invalid vehicle ID'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().positive().optional(),
  timestamp: z.string().datetime().optional(),
});

export const aiTrackingBatchSchema = z.object({
  points: z.array(aiTrackingSchema).min(1).max(100),
});

// ── Alert from AI ───────────────────────────────────────────────────────────
export const aiAlertSchema = z.object({
  type: z.enum([
    'accident', 'congestion', 'signal_malfunction',
    'blacklisted_vehicle', 'emergency', 'road_closure',
    'weather', 'other',
  ]),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().positive().optional(),
  vehicle_id: z.string().uuid().optional(),
  signal_id: z.string().optional(),
});

// ── Signal state change from AI ─────────────────────────────────────────────
export const aiSignalStateSchema = z.object({
  state: z.enum(['red', 'yellow', 'green', 'flashing', 'off']),
  duration: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});

// ── Type exports ────────────────────────────────────────────────────────────
export type AiViolationInput = z.infer<typeof aiViolationSchema>;
export type AiTrackingInput = z.infer<typeof aiTrackingSchema>;
export type AiTrackingBatchInput = z.infer<typeof aiTrackingBatchSchema>;
export type AiAlertInput = z.infer<typeof aiAlertSchema>;
export type AiSignalStateInput = z.infer<typeof aiSignalStateSchema>;
