import { z } from 'zod';

export const createAlertSchema = z.object({
  type: z.enum(['accident', 'congestion', 'signal_malfunction', 'blacklisted_vehicle', 'emergency', 'road_closure', 'weather', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().positive().optional(),
  vehicleId: z.string().uuid().optional(),
  signalId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const updateAlertSchema = z.object({
  status: z.enum(['active', 'acknowledged', 'resolved', 'expired']).optional(),
  resolvedBy: z.string().uuid().optional(),
  resolvedNotes: z.string().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export const alertQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['accident', 'congestion', 'signal_malfunction', 'blacklisted_vehicle', 'emergency', 'road_closure', 'weather', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['active', 'acknowledged', 'resolved', 'expired']).optional(),
  activeOnly: z.coerce.boolean().optional(),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
export type AlertQuery = z.infer<typeof alertQuerySchema>;
