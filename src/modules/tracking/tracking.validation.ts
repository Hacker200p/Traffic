import { z } from 'zod';

export const trackingPointSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle ID'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().positive().optional(),
  timestamp: z.string().datetime().optional(),
});

export const trackingBatchSchema = z.object({
  points: z.array(trackingPointSchema).min(1).max(100),
});

export const trackingQuerySchema = z.object({
  vehicleId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
});

export const geofenceQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().positive().max(50000).default(1000),
});

export type TrackingPointInput = z.infer<typeof trackingPointSchema>;
export type TrackingBatchInput = z.infer<typeof trackingBatchSchema>;
export type TrackingQuery = z.infer<typeof trackingQuerySchema>;
export type GeofenceQuery = z.infer<typeof geofenceQuerySchema>;
