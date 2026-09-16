/**
 * modules/operations — public API (narrow by design).
 *
 * Capabilities migrated: task completion (checkpoint 2), task planning
 * (checkpoint 5: POST /api/tasks). Unmigrated Operations (list, PATCH,
 * bulk, quick-log, hq/tasks) still lives in its route/lib location
 * (see docs/architecture/MIGRATION_STATUS.md).
 *
 * Import ONLY from here — never from domain/, application/, schemas/
 * internals (enforced by tests/architecture/boundaries.test.ts).
 */

export { updateTask } from "./application/updateTask";
export { taskUpdateSchema, type TaskUpdateInput } from "./schemas/taskUpdate";
export {
  TASK_TRANSITIONS,
  canTransitionTask,
  OFFICER_REQUESTABLE_STATUSES,
  assertOfficerStatusPermitted,
  assertOfficerTransitionAllowed,
} from "./domain/taskTransitions";
export {
  PLANNING_FIELDS,
  hasPlanningFields,
  assertTaskOwnership,
  assertOfficerFieldScope,
  assertNotCompletion,
  type UpdatableTask,
} from "./domain/taskUpdate";
export { listTasks } from "./application/listTasks";
export { presentTaskMedia, type MediaIdentity, type PresentedMedia } from "./application/presentTaskMedia";
export { parseTaskListParams, type TaskListFilters, type TaskListParams } from "./schemas/taskList";
export { planTask } from "./application/planTask";
export { plannedTaskSchema, type PlannedTaskInput } from "./schemas/plannedTask";
export {
  assertPlanningWindow,
  assertFarmActive,
  assertOfficerEligible,
  assertPlotInFarm,
  assertCycleInScope,
  type OfficerEligibilityRow,
} from "./domain/plannedTask";
export { completeTask } from "./application/completeTask";
export { completionSchema, type CompletionInput } from "./schemas/completion";
export {
  CompletionFault,
  labourHours,
  assertAssignee,
  assertCompletableStatus,
  assertActualsAllowed,
  geofenceLabel,
  type CompletableTask,
} from "./domain/completion";
