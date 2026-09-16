import { z } from "zod";

/**
 * Transport validation for POST /api/attendance (START/END).
 * Moved verbatim from the route: shapes live at the edge; lifecycle and
 * geofence rules live in domain/attendancePolicy.ts + spatial.
 */
export const attendanceSchema = z.object({
  farmId: z.string().optional(),
  plotId: z.string().optional(),
  action: z.enum(["START", "END"]),
  latitude: z.number().gte(-90).lte(90).optional(),
  longitude: z.number().gte(-180).lte(180).optional(),
  accuracyMeters: z.number().optional(),
  selfieMediaId: z.string().optional(),
  reason: z.string().min(3).max(1000).optional(),
});

export type AttendanceInput = z.infer<typeof attendanceSchema>;
