import { prisma } from "@/infrastructure/db";
import { audit } from "@/lib/audit";
import { requireFarmAccess, requireRole } from "@modules/auth";
import type { Actor } from "@modules/auth";
import { persistTaskUpdate } from "../infrastructure/taskQueries";
import { presentTaskMedia } from "./presentTaskMedia";
import { assertOfficerEligible, assertPlotInFarm, assertCycleInScope } from "../domain/plannedTask";
import {
  hasPlanningFields,
  assertTaskOwnership,
  assertOfficerFieldScope,
  assertNotCompletion,
} from "../domain/taskUpdate";
import { assertOfficerStatusPermitted, assertOfficerTransitionAllowed } from "../domain/taskTransitions";
import { taskUpdateSchema } from "../schemas/taskUpdate";

type Db = typeof prisma;

/**
 * updateTask — the ONE application use-case for PATCH /api/tasks/[taskId]:
 * field edits + officer status transitions + planning reassignment.
 *
 * Moved verbatim from the route: load-before-gate order, conditional
 * manage flag, officer ownership/field/status gates, COMPLETED redirect,
 * officer-only table gate, revalidations, single transaction, media
 * presentation via the canonical presenter, UPDATE audit, same response.
 *
 * Preserved exactly (see domain/taskTransitions.ts for the matrix):
 * - Zod parse runs AFTER the task load (404 beats 422 on bad id + bad body).
 * - Privileged roles bypass the transition table (reopen/terminal edits OK).
 * - Revalidation guards are truthy-checks (null clears unchecked).
 * - Revalidation reuses plannedTask asserts: officer predicate + messages
 *   identical; PATCH keeps findUnique (missing user → 422) vs creation's
 *   findUniqueOrThrow (→ 404). hq/tasks keeps its own copy until its slice.
 * - No concurrency protection (last-writer-wins) — preserved, not added.
 */
export async function updateTask(opts: {
  taskId: string;
  body: unknown;
  actor: Actor;
  db?: Db;
}): Promise<{ result: Record<string, unknown> }> {
  const { taskId, body, actor, db = prisma } = opts;

  const task = await db.task.findUniqueOrThrow({ where: { id: taskId } });
  const input = taskUpdateSchema.parse(body);

  const planning = hasPlanningFields(Object.keys(input));
  await requireFarmAccess(task.farmId, planning && actor.role === "FARM_ADMIN");

  if (actor.role === "FARM_OFFICER") {
    assertTaskOwnership(task, actor.id);
    assertOfficerFieldScope(planning);
    if (input.status) assertOfficerStatusPermitted(input.status);
  } else {
    requireRole(actor.role, ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST"]);
  }

  assertNotCompletion(input.status);
  if (actor.role === "FARM_OFFICER" && input.status) {
    assertOfficerTransitionAllowed(task.status, input.status);
  }

  if (input.assignedOfficerId) {
    const officer = await db.user.findUnique({
      where: { id: input.assignedOfficerId },
      select: { role: true, active: true, farmAccess: { where: { farmId: task.farmId } } },
    });
    assertOfficerEligible(officer);
  }

  if (input.plotId) {
    const plot = await db.plot.findFirst({
      where: { id: input.plotId, farmId: task.farmId, deletedAt: null },
    });
    assertPlotInFarm(!!plot);
  }
  if (input.cropCycleId) {
    const cycle = await db.cropCycle.findFirst({
      where: {
        id: input.cropCycleId,
        plot: { farmId: task.farmId, deletedAt: null },
        ...(input.plotId ? { plotId: input.plotId } : {}),
      },
    });
    assertCycleInScope(!!cycle);
  }

  const { status, ...fields } = input;
  const result = await persistTaskUpdate(db, {
    taskId,
    data: {
      ...fields,
      ...(status ? { status } : {}),
      ...(!task.assignedOfficerId && actor.role === "FARM_OFFICER" ? { assignedOfficerId: actor.id } : {}),
    },
    startExecution: status === "IN_PROGRESS" ? { officerId: actor.id } : null,
  });

  const { media, primaryImageUrl } = await presentTaskMedia(
    result.executions.flatMap((e) => e.media || [])
  );

  await audit(actor.id, "UPDATE", "Task", taskId, {
    from: task.status,
    to: status ?? task.status,
    fields: Object.keys(fields),
  });

  return { result: { ...result, primaryImageUrl, media } };
}
