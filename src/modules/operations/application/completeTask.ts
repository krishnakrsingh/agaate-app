import type { Prisma } from "@prisma/client";
import { HttpError, requireFarmAccess, type Actor } from "@modules/auth";
import { audit } from "@/infrastructure/audit";
import { prisma } from "@/infrastructure/db";
import { validateAttendanceLocation, type GeofenceBasis } from "@modules/spatial";
import {
  CompletionFault,
  labourHours,
  assertAssignee,
  assertCompletableStatus,
  assertActualsAllowed,
  geofenceLabel,
} from "../domain/completion";
import type { CompletionInput } from "../schemas/completion";

type Db = typeof prisma;
type Tx = Prisma.TransactionClient;

/**
 * completeTask — the ONE application use-case for officer execution completion
 * (IN_PROGRESS → COMPLETED + execution ledger + milestone/crop actuals).
 *
 * Moved verbatim from app/api/tasks/[taskId]/complete/route.ts: same reads,
 * same writes, same order, same error bodies. The route is now a thin
 * adapter (parse → authenticate → call → respond).
 *
 * Deliberately NOT abstracted further:
 * - No repository: the Prisma transaction IS the persistence boundary
 *   (see ADR-006). `db` is injectable for tests, defaulting to the singleton.
 * - Milestone/cropCycle writes stay inside this transaction: splitting them
 *   into cross-module calls would break atomicity. cropping owns those
 *   tables long-term; operations orchestrates this write TODAY (documented
 *   in MODULE_BOUNDARIES, not hidden).
 * - Geofence math stays in modules/spatial; this file only orchestrates
 *   rows in → decision → rows out.
 */
export async function completeTask(opts: {
  taskId: string;
  input: CompletionInput;
  actor: Actor;
  db?: Db;
}): Promise<{ execution: Awaited<ReturnType<typeof persistCompletion>> }> {
  const { taskId, input, actor, db = prisma } = opts;

  const task = await db.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { cropCycle: true, milestone: true },
  });
  await requireFarmAccess(task.farmId);
  assertAssignee(task, actor);
  assertCompletableStatus(task.status);

  // Optional completion GPS: when the task names a plot, the officer must
  // be inside it (canonical plot → farm → radius hierarchy). No reason
  // escape — unlike attendance, tasks cannot complete remotely.
  // Without GPS (or without a plot) legacy behavior is unchanged.
  let completionGeo: { latitude: number; longitude: number; basis: GeofenceBasis | null } | null = null;
  if (input.latitude !== undefined || input.longitude !== undefined) {
    if (input.latitude === undefined || input.longitude === undefined) {
      throw new CompletionFault(422, {
        error: "GPS completion needs both latitude and longitude.",
        code: "GPS_INVALID",
      });
    }
    if (task.plotId) {
      const plot = await db.plot.findUnique({
        where: { id: task.plotId },
        select: { farmId: true, name: true, boundaryGeoJson: true, deletedAt: true, status: true },
      });
      const farm = await db.farm.findUniqueOrThrow({
        where: { id: task.farmId },
        select: { latitude: true, longitude: true, geofenceRadiusMeters: true, boundaryGeoJson: true },
      });
      // Legacy rows may link plots across farms (officer route pre-fix):
      // farm-level check then, never a mismatch 422 on completion.
      const sameFarmPlot = plot && plot.farmId === task.farmId ? plot : null;
      const checked = validateAttendanceLocation({
        lat: input.latitude,
        lng: input.longitude,
        accuracyMeters: input.accuracyMeters,
        farmId: task.farmId,
        farm,
        plot: sameFarmPlot,
      });
      if (!checked.ok) {
        throw new CompletionFault(checked.status, { error: checked.message, code: checked.code });
      }
      if (!checked.inside) {
        throw new CompletionFault(422, {
          error: `Completion requires presence inside ${plot?.name ?? "the plot"} — ${Math.round(checked.distanceMeters)}m away (checked against ${geofenceLabel(checked.basis)}).`,
          code: "COMPLETION_OUTSIDE_PLOT",
          distanceMeters: checked.distanceMeters,
          geofenceBasis: checked.basis,
        });
      }
      completionGeo = { latitude: input.latitude, longitude: input.longitude, basis: checked.basis };
    } else {
      completionGeo = { latitude: input.latitude, longitude: input.longitude, basis: null };
    }
  }

  assertActualsAllowed(task, input);

  const execution = await persistCompletion(db, { taskId, task, input, actorId: actor.id, completionGeo });

  await audit(actor.id, "COMPLETE", "Task", taskId, {
    actualBedsCreated: input.actualBedsCreated,
    actualPlants: input.actualPlants,
  });

  return { execution };
}

async function persistCompletion(
  db: Db,
  args: {
    taskId: string;
    task: { farmId: string; cropCycleId: string | null; milestoneId: string | null };
    input: CompletionInput;
    actorId: string;
    completionGeo: { latitude: number; longitude: number; basis: GeofenceBasis | null } | null;
  }
) {
  const { taskId, task, input, actorId, completionGeo } = args;
  return db.$transaction(async (tx: Tx) => {
    const ex = await tx.taskExecution.upsert({
      where: { taskId },
      update: {
        officerId: actorId,
        status: "COMPLETED",
        completedAt: new Date(),
        remarks: input.remarks,
        ...(completionGeo
          ? { latitude: completionGeo.latitude, longitude: completionGeo.longitude, geofenceBasis: completionGeo.basis }
          : {}),
        materials: { deleteMany: {}, create: input.materials },
        labour: {
          deleteMany: {},
          create: input.labour.map((l) => ({ ...l, labourHours: labourHours(l.labourers, l.hours) })),
        },
      },
      create: {
        taskId,
        officerId: actorId,
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
        remarks: input.remarks,
        ...(completionGeo
          ? { latitude: completionGeo.latitude, longitude: completionGeo.longitude, geofenceBasis: completionGeo.basis }
          : {}),
        materials: { create: input.materials },
        labour: {
          create: input.labour.map((l) => ({ ...l, labourHours: labourHours(l.labourers, l.hours) })),
        },
      },
    });
    if (input.mediaIds.length) {
      const count = await tx.mediaAsset.updateMany({
        where: {
          id: { in: input.mediaIds },
          uploadedById: actorId,
          kind: "ACTIVITY_EVIDENCE",
          executionId: null,
          verifiedAt: { not: null },
        },
        data: { executionId: ex.id, farmId: task.farmId },
      });
      if (count.count !== input.mediaIds.length)
        throw new HttpError(422, "One or more activity evidence files are unavailable or unverified.");
    }
    if (task.cropCycleId && (input.actualBedsCreated !== undefined || input.actualPlants !== undefined))
      await tx.cropCycle.update({
        where: { id: task.cropCycleId },
        data: {
          ...(input.actualBedsCreated !== undefined ? { actualBedsCreated: input.actualBedsCreated } : {}),
          ...(input.actualPlants !== undefined ? { actualPlants: input.actualPlants } : {}),
        },
      });
    if (task.milestoneId)
      await tx.milestone.update({
        where: { id: task.milestoneId },
        data: { status: "COMPLETED", completedAt: new Date(), remarks: input.remarks ?? undefined },
      });
    await tx.task.update({ where: { id: taskId }, data: { status: "COMPLETED" } });
    return ex;
  });
}
