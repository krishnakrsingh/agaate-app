import { z } from "zod";

/**
 * Transport validation for POST /api/tasks/[taskId]/complete.
 * Moved verbatim from the route (behavior preservation over elegance):
 * shape + ranges live at the HTTP edge; domain invariants live in
 * modules/operations/domain/completion.ts.
 */
export const completionSchema = z.object({
  remarks: z.string().max(2000).optional().nullable(),
  materials: z
    .array(
      z.object({
        materialName: z.string().min(1).max(120),
        quantity: z.coerce.number().positive(),
        unit: z.string().min(1).max(30),
      })
    )
    .max(30)
    .default([]),
  labour: z
    .array(
      z.object({
        labourers: z.coerce.number().int().positive().max(1000),
        hours: z.coerce.number().positive().max(24),
      })
    )
    .max(20)
    .default([]),
  mediaIds: z.array(z.string().min(1)).max(20).default([]),
  actualBedsCreated: z.coerce.number().nonnegative().optional(),
  actualPlants: z.coerce.number().nonnegative().optional(),
  latitude: z.number().gte(-90).lte(90).optional(),
  longitude: z.number().gte(-180).lte(180).optional(),
  accuracyMeters: z.number().optional(),
});

export type CompletionInput = z.infer<typeof completionSchema>;
