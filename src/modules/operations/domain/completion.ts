/**
 * operations/domain/completion — pure business rules for task completion.
 *
 * Source of truth for:
 * - who may complete whose task (assignee policy)
 * - which status may complete (IN_PROGRESS-only gate)
 * - which milestones accept actual bed/plant counts
 *
 * Pure: no Prisma, no Next, no HTTP. Framework-free errors only
 * (CompletionFault carries {status, body} so the route can render the
 * EXACT legacy response shape without the domain knowing about HTTP).
 */

export class CompletionFault extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
  ) {
    super(typeof body.error === "string" ? body.error : "Task completion failed.");
    this.name = "CompletionFault";
  }
}

export function labourHours(labourers: number, hours: number): number {
  return labourers * hours;
}

export interface CompletableTask {
  status: string;
  assignedOfficerId: string | null;
  cropCycleId: string | null;
  milestoneId: string | null;
  milestone?: { name: string } | null;
}

export interface CompletionActuals {
  actualBedsCreated?: number;
  actualPlants?: number;
}

/** FARM_OFFICER may only complete their own task. SUPER_ADMIN bypasses (edge role check). */
export function assertAssignee(task: CompletableTask, actor: { id: string; role: string }): void {
  if (actor.role === "FARM_OFFICER" && task.assignedOfficerId !== actor.id) {
    throw new CompletionFault(403, { error: "This task is assigned to another officer." });
  }
}

/** Only IN_PROGRESS tasks complete. Mirrors taskTransitions IN_PROGRESS → COMPLETED. */
export function assertCompletableStatus(status: string): void {
  if (status !== "IN_PROGRESS") {
    throw new CompletionFault(409, { error: "Start the activity before recording completion." });
  }
}

/**
 * Actual bed/plant counts are milestone-gated (cropping-owned vocabulary,
 * operations-enforced gate — see MODULE_BOUNDARIES).
 */
export function assertActualsAllowed(task: CompletableTask, input: CompletionActuals): void {
  if (input.actualBedsCreated !== undefined) {
    if (!task.cropCycleId || !task.milestoneId || task.milestone?.name !== "Land Preparation") {
      throw new CompletionFault(422, {
        error: "Actual bed count can only be recorded on the Land Preparation milestone.",
      });
    }
  }
  if (input.actualPlants !== undefined) {
    const allowed = new Set(["Transplantation", "Direct Sowing"]);
    if (!task.cropCycleId || !task.milestoneId || !allowed.has(task.milestone?.name ?? "")) {
      throw new CompletionFault(422, {
        error: "Actual plant count can only be recorded on a Transplantation or Direct Sowing milestone.",
      });
    }
  }
}

/** Human label for the fence that authorized (or refused) a completion. */
export function geofenceLabel(basis: string): string {
  if (basis === "PLOT_POLYGON") return "plot fence";
  if (basis === "FARM_POLYGON") return "farm fence";
  return "radius";
}
