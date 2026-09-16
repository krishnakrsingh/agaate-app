import type { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/db";
import { audit } from "@/infrastructure/audit";
import { requireFarmAccess } from "@modules/auth";
import type { Actor } from "@modules/auth";
import {
  assertPlanningWindow,
  assertFarmActive,
  assertOfficerEligible,
  assertPlotInFarm,
  assertCycleInScope,
} from "../domain/plannedTask";
import { presentTaskMedia, type PresentedMedia } from "./presentTaskMedia";
import type { PlannedTaskInput } from "../schemas/plannedTask";

type Db = typeof prisma;
type Tx = Prisma.TransactionClient;

/**
 * planTask — the ONE application use-case for agronomist task planning
 * (POST /api/tasks): plan-bucket upsert + ASSIGNED task + planning
 * execution/media claim, atomically.
 *
 * Moved verbatim from app/api/tasks/route.ts POST: same reads in the same
 * order, same guards, same transaction, same audit. The route is now a
 * thin adapter (parse → authenticate → edge role check → call → enrich →
 * respond). Media URL signing stays in the route: it is response
 * presentation, not planning.
 *
 * Deliberately NOT abstracted further:
 * - No repository: reads are throwing scope-checks, the write is one
 *   transaction; `db` is injectable for tests, defaulting to the singleton.
 * - The silent media `updateMany` (no count check) is preserved EXACTLY —
 *   unclaimed/foreign mediaIds succeed with fewer attachments (legacy
 *   semantics; changing it is a product decision, not a migration).
 * - AgronomyPlan upsert + task create stay in one transaction for atomicity
 *   (same rationale as ADR-006 completion slice).
 */
export async function planTask(opts: {
  input: PlannedTaskInput;
  actor: Actor;
  db?: Db;
}): Promise<{ task: Awaited<ReturnType<typeof persistPlannedTask>> & PresentedMedia }> {
  const { input, actor, db = prisma } = opts;

  assertPlanningWindow(input.date);
  await requireFarmAccess(input.farmId);

  const farm = await db.farm.findUniqueOrThrow({
    where: { id: input.farmId },
    select: { status: true },
  });
  assertFarmActive(farm.status);

  const officer = await db.user.findUniqueOrThrow({
    where: { id: input.assignedOfficerId },
    select: { role: true, active: true, farmAccess: { where: { farmId: input.farmId } } },
  });
  assertOfficerEligible(officer);

  if (input.plotId) {
    const plot = await db.plot.findFirst({
      where: { id: input.plotId, farmId: input.farmId, deletedAt: null },
    });
    assertPlotInFarm(!!plot);
  }
  if (input.cropCycleId) {
    const cycle = await db.cropCycle.findFirst({
      where: {
        id: input.cropCycleId,
        plot: { farmId: input.farmId, deletedAt: null },
        ...(input.plotId ? { plotId: input.plotId } : {}),
      },
    });
    assertCycleInScope(!!cycle);
  }

  const task = await persistPlannedTask(db, { input, actorId: actor.id });

  // Response presentation (was route-inline): sign claimed media for the
  // 201 payload. Runs BEFORE audit, exactly as the legacy route ordered it.
  let presented: PresentedMedia = { media: [], primaryImageUrl: null };
  if (input.mediaIds && input.mediaIds.length > 0) {
    const mediaAssets = await db.mediaAsset.findMany({
      where: { id: { in: input.mediaIds } },
    });
    presented = await presentTaskMedia(mediaAssets);
  }

  await audit(actor.id, "CREATE", "Task", task.id, {
    farmId: task.farmId,
    origin: "AGRONOMIST",
    mediaCount: input.mediaIds?.length || 0,
  });

  return { task: { ...task, ...presented } };
}

async function persistPlannedTask(db: Db, args: { input: PlannedTaskInput; actorId: string }) {
  const { input, actorId } = args;
  return db.$transaction(async (tx: Tx) => {
    const plan = await tx.agronomyPlan.upsert({
      where: { farmId_planDate: { farmId: input.farmId, planDate: input.date } },
      update: {},
      create: { farmId: input.farmId, planDate: input.date, createdById: actorId },
    });

    const created = await tx.task.create({
      data: {
        farmId: input.farmId,
        plotId: input.plotId,
        cropCycleId: input.cropCycleId,
        planId: plan.id,
        origin: "AGRONOMIST",
        category: input.category,
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        priority: input.priority,
        dueDate: input.date,
        status: "ASSIGNED",
        assignedOfficerId: input.assignedOfficerId,
        createdById: actorId,
      },
      include: {
        farm: { select: { id: true, name: true } },
        plot: { select: { id: true, name: true } },
        cropCycle: { select: { id: true, cropName: true } },
        milestone: { select: { id: true, name: true } },
        assignedOfficer: { select: { name: true } },
      },
    });

    if (input.mediaIds && input.mediaIds.length > 0) {
      const execution = await tx.taskExecution.create({
        data: {
          taskId: created.id,
          officerId: input.assignedOfficerId,
          status: "ASSIGNED",
          remarks: "Task planning reference photo.",
        },
      });

      await tx.mediaAsset.updateMany({
        where: {
          id: { in: input.mediaIds },
          uploadedById: actorId,
          kind: "ACTIVITY_EVIDENCE",
          executionId: null,
        },
        data: {
          executionId: execution.id,
          farmId: input.farmId,
        },
      });
    }

    return created;
  });
}
