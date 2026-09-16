/**
 * operations/domain/taskUpdate — pure guards for the PATCH update path.
 *
 * Three concepts kept separate (§5):
 * - AUTHORIZATION (who may act): ownership + planning-field ban + role gate
 *   live here as pure predicates over (task, actor, input keys); the
 *   requireRole/requireFarmAccess transport calls stay in application/.
 * - ELIGIBILITY (are conditions valid): delegated to domain/plannedTask.ts
 *   asserts (shared with creation — the 3× inline copies are now 2, hq last).
 * - STATE TRANSITION (is FROM→TO legal): domain/taskTransitions.ts.
 *
 * Pure: no Prisma, no Next, no HTTP.
 */

import { HttpError } from "@/shared/errors";

/**
 * Legacy planning-field list, verbatim (includes `category`, which the
 * transport schema does not accept — dead entry, preserved not cleaned).
 */
export const PLANNING_FIELDS = ["category", "priority", "dueDate", "assignedOfficerId", "plotId", "cropCycleId"];

export function hasPlanningFields(inputKeys: string[]): boolean {
  return inputKeys.some((k) => PLANNING_FIELDS.includes(k));
}

export interface UpdatableTask {
  assignedOfficerId: string | null;
}

/** FARM_OFFICER may only touch their own (or unassigned) task. */
export function assertTaskOwnership(task: UpdatableTask, actorId: string): void {
  if (task.assignedOfficerId && task.assignedOfficerId !== actorId) {
    throw new HttpError(403, "This task is assigned to another officer.");
  }
}

/** FARM_OFFICER may not edit planning fields. */
export function assertOfficerFieldScope(hasPlanning: boolean): void {
  if (hasPlanning) {
    throw new HttpError(403, "Farm Officers cannot edit planned activity details.");
  }
}

/** COMPLETED is never set via PATCH (execution endpoint owns it). */
export function assertNotCompletion(status: string | undefined): void {
  if (status === "COMPLETED") {
    throw new HttpError(409, "Use the execution completion endpoint to complete an activity.");
  }
}
