import { z } from "zod";

/**
 * Transport validation for PATCH /api/tasks/[taskId].
 * Moved verbatim from the route: shapes live at the edge; transition and
 * eligibility policy live in domain/taskTransitions.ts + domain/taskUpdate.ts.
 * NOTE: `category` is accepted by planningFields but absent here (dead entry
 * in the legacy list — preserved, not cleaned).
 */
export const taskUpdateSchema = z.object({
  status: z.enum(["ASSIGNED", "AVAILABLE", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED"]).optional(),
  title: z.string().min(3).max(160).optional(),
  description: z.string().min(3).max(2000).optional(),
  instructions: z.string().max(2000).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.coerce.date().optional(),
  assignedOfficerId: z.string().min(1).nullable().optional(),
  plotId: z.string().min(1).nullable().optional(),
  cropCycleId: z.string().min(1).nullable().optional(),
});

export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
