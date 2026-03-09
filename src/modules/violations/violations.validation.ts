import { z } from 'zod';

export const createViolationSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle ID'),
  type: z.enum(['red_light', 'speeding', 'wrong_way', 'illegal_parking', 'no_seatbelt', 'illegal_turn', 'other']),
  description: z.string().max(1000).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().positive().optional(),
  speedLimit: z.number().positive().optional(),
  evidenceUrl: z.string().url().optional(),
  signalId: z.string().uuid().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  fineAmount: z.number().positive().optional(),
});

export const updateViolationSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'confirmed', 'dismissed', 'appealed']).optional(),
  reviewedBy: z.string().uuid().optional(),
  reviewNotes: z.string().max(1000).optional(),
  fineAmount: z.number().positive().optional(),
});

export const violationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['red_light', 'speeding', 'wrong_way', 'illegal_parking', 'no_seatbelt', 'illegal_turn', 'other']).optional(),
  status: z.enum(['pending', 'reviewed', 'confirmed', 'dismissed', 'appealed']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  vehicleId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateViolationInput = z.infer<typeof createViolationSchema>;
export type UpdateViolationInput = z.infer<typeof updateViolationSchema>;
export type ViolationQuery = z.infer<typeof violationQuerySchema>;
