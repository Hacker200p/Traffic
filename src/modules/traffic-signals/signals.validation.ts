import { z } from 'zod';

export const createSignalSchema = z.object({
  name: z.string().min(1).max(200),
  intersectionName: z.string().max(300).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  direction: z.enum(['north', 'south', 'east', 'west', 'north_east', 'north_west', 'south_east', 'south_west']),
  type: z.enum(['standard', 'pedestrian', 'arrow', 'flashing', 'emergency']).default('standard'),
  defaultGreenDuration: z.number().int().positive().default(30),
  defaultYellowDuration: z.number().int().positive().default(5),
  defaultRedDuration: z.number().int().positive().default(30),
  isAutonomous: z.boolean().default(true),
  groupId: z.string().uuid().optional(),
  cameraUrl: z.string().url().optional(),
});

export const updateSignalSchema = createSignalSchema.partial();

export const signalStateSchema = z.object({
  state: z.enum(['green', 'yellow', 'red', 'flashing_red', 'flashing_yellow', 'off']),
  duration: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
  overrideUntil: z.string().datetime().optional(),
});

export const signalQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['standard', 'pedestrian', 'arrow', 'flashing', 'emergency']).optional(),
  state: z.enum(['green', 'yellow', 'red', 'flashing_red', 'flashing_yellow', 'off']).optional(),
  isAutonomous: z.coerce.boolean().optional(),
  groupId: z.string().uuid().optional(),
});

export const signalScheduleSchema = z.object({
  signalId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  greenDuration: z.number().int().positive(),
  yellowDuration: z.number().int().positive(),
  redDuration: z.number().int().positive(),
});

export type CreateSignalInput = z.infer<typeof createSignalSchema>;
export type UpdateSignalInput = z.infer<typeof updateSignalSchema>;
export type SignalStateInput = z.infer<typeof signalStateSchema>;
export type SignalQuery = z.infer<typeof signalQuerySchema>;
export type SignalScheduleInput = z.infer<typeof signalScheduleSchema>;
