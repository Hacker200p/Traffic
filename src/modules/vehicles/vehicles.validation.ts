import { z } from 'zod';

export const createVehicleSchema = z.object({
  plateNumber: z.string().min(1, 'Plate number is required').max(20),
  type: z.enum(['car', 'truck', 'motorcycle', 'bus', 'emergency', 'bicycle']),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  year: z.number().int().min(1900).max(2030).optional(),
  ownerName: z.string().max(200).optional(),
  ownerContact: z.string().max(100).optional(),
  isBlacklisted: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const vehicleQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['car', 'truck', 'motorcycle', 'bus', 'emergency', 'bicycle']).optional(),
  plateNumber: z.string().optional(),
  isBlacklisted: z.coerce.boolean().optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type VehicleQuery = z.infer<typeof vehicleQuerySchema>;
