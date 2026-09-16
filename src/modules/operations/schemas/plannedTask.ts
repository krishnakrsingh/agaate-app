import { z } from "zod";

/**
 * Transport validation for POST /api/tasks (agronomist task planning).
 * Moved verbatim from the route: shape + ranges live at the HTTP edge;
 * planning-window/membership invariants live in domain/plannedTask.ts.
 */
export const plannedTaskSchema = z.object({
  farmId: z.string().min(1),
  plotId: z.string().min(1).optional().nullable(),
  cropCycleId: z.string().min(1).optional().nullable(),
  date: z.coerce.date(),
  category: z.enum([
    "FERTIGATION",
    "FOLIAR_NUTRITION",
    "SOIL_APPLICATION",
    "PREVENTIVE_SPRAY",
    "PEST_CONTROL",
    "DISEASE_CONTROL",
    "CROP_MONITORING",
    "IRRIGATION_RECOMMENDATION",
    "CULTURAL_PRACTICE",
    "CROP_SPECIFIC",
  ]),
  title: z.string().min(3).max(160),
  description: z.string().min(3).max(2000),
  instructions: z.string().max(2000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assignedOfficerId: z.string().min(1),
  mediaIds: z.array(z.string().min(1)).optional().default([]),
});

export type PlannedTaskInput = z.infer<typeof plannedTaskSchema>;
