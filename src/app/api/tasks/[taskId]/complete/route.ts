import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole, HttpError } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { labourHours } from "@/lib/business";
import { apiError } from "@/lib/api";
import { validateAttendanceLocation, type GeofenceBasis } from "@/lib/attendance-geo";

const schema = z.object({ remarks: z.string().max(2000).optional().nullable(), materials: z.array(z.object({ materialName: z.string().min(1).max(120), quantity: z.coerce.number().positive(), unit: z.string().min(1).max(30) })).max(30).default([]), labour: z.array(z.object({ labourers: z.coerce.number().int().positive().max(1000), hours: z.coerce.number().positive().max(24) })).max(20).default([]), mediaIds: z.array(z.string().min(1)).max(20).default([]), actualBedsCreated: z.coerce.number().nonnegative().optional(), actualPlants: z.coerce.number().nonnegative().optional(), latitude: z.number().gte(-90).lte(90).optional(), longitude: z.number().gte(-180).lte(180).optional(), accuracyMeters: z.number().optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const actor = await currentActor();
    requireRole(actor.role, ["FARM_OFFICER", "SUPER_ADMIN"]);
    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId }, include: { cropCycle: true, milestone: true } });
    await requireFarmAccess(task.farmId);
    if (actor.role === "FARM_OFFICER" && task.assignedOfficerId !== actor.id) throw new HttpError(403, "This task is assigned to another officer.");
    if (task.status !== "IN_PROGRESS") return NextResponse.json({ error: "Start the activity before recording completion." }, { status: 409 });
    const input = schema.parse(await request.json());
    // Optional completion GPS: when the task names a plot, the officer must
    // be inside it (canonical plot → farm → radius hierarchy). No reason
    // escape — unlike attendance, tasks cannot complete remotely.
    // Without GPS (or without a plot) legacy behavior is unchanged.
    let completionGeo: { latitude: number; longitude: number; basis: GeofenceBasis | null } | null = null;
    if (input.latitude !== undefined || input.longitude !== undefined) {
      if (input.latitude === undefined || input.longitude === undefined) {
        return NextResponse.json({ error: "GPS completion needs both latitude and longitude.", code: "GPS_INVALID" }, { status: 422 });
      }
      if (task.plotId) {
        const plot = await prisma.plot.findUnique({
          where: { id: task.plotId },
          select: { farmId: true, name: true, boundaryGeoJson: true, deletedAt: true, status: true },
        });
        const farm = await prisma.farm.findUniqueOrThrow({
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
          return NextResponse.json({ error: checked.message, code: checked.code }, { status: checked.status });
        }
        if (!checked.inside) {
          return NextResponse.json(
            {
              error: `Completion requires presence inside ${plot?.name ?? "the plot"} — ${Math.round(checked.distanceMeters)}m away (checked against ${checked.basis === "PLOT_POLYGON" ? "plot fence" : checked.basis === "FARM_POLYGON" ? "farm fence" : "radius"}).`,
              code: "COMPLETION_OUTSIDE_PLOT",
              distanceMeters: checked.distanceMeters,
              geofenceBasis: checked.basis,
            },
            { status: 422 }
          );
        }
        completionGeo = { latitude: input.latitude, longitude: input.longitude, basis: checked.basis };
      } else {
        completionGeo = { latitude: input.latitude, longitude: input.longitude, basis: null };
      }
    }
    if (input.actualBedsCreated !== undefined) {
      if (!task.cropCycleId || !task.milestoneId || task.milestone?.name !== "Land Preparation") return NextResponse.json({ error: "Actual bed count can only be recorded on the Land Preparation milestone." }, { status: 422 });
    }
    if (input.actualPlants !== undefined) {
      const allowed = new Set(["Transplantation", "Direct Sowing"]);
      if (!task.cropCycleId || !task.milestoneId || !allowed.has(task.milestone?.name ?? "")) return NextResponse.json({ error: "Actual plant count can only be recorded on a Transplantation or Direct Sowing milestone." }, { status: 422 });
    }
    const execution = await prisma.$transaction(async tx => {
      const ex = await tx.taskExecution.upsert({ where: { taskId }, update: { officerId: actor.id, status: "COMPLETED", completedAt: new Date(), remarks: input.remarks, ...(completionGeo ? { latitude: completionGeo.latitude, longitude: completionGeo.longitude, geofenceBasis: completionGeo.basis } : {}), materials: { deleteMany: {}, create: input.materials }, labour: { deleteMany: {}, create: input.labour.map(l => ({ ...l, labourHours: labourHours(l.labourers, l.hours) })) } }, create: { taskId, officerId: actor.id, status: "COMPLETED", startedAt: new Date(), completedAt: new Date(), remarks: input.remarks, ...(completionGeo ? { latitude: completionGeo.latitude, longitude: completionGeo.longitude, geofenceBasis: completionGeo.basis } : {}), materials: { create: input.materials }, labour: { create: input.labour.map(l => ({ ...l, labourHours: labourHours(l.labourers, l.hours) })) } } });
      if (input.mediaIds.length) {
        const count = await tx.mediaAsset.updateMany({ where: { id: { in: input.mediaIds }, uploadedById: actor.id, kind: "ACTIVITY_EVIDENCE", executionId: null, verifiedAt: { not: null } }, data: { executionId: ex.id, farmId: task.farmId } });
        if (count.count !== input.mediaIds.length) throw new HttpError(422, "One or more activity evidence files are unavailable or unverified.");
      }
      if (task.cropCycleId && (input.actualBedsCreated !== undefined || input.actualPlants !== undefined)) await tx.cropCycle.update({ where: { id: task.cropCycleId }, data: { ...(input.actualBedsCreated !== undefined ? { actualBedsCreated: input.actualBedsCreated } : {}), ...(input.actualPlants !== undefined ? { actualPlants: input.actualPlants } : {}) } });
      if (task.milestoneId) await tx.milestone.update({ where: { id: task.milestoneId }, data: { status: "COMPLETED", completedAt: new Date(), remarks: input.remarks ?? undefined } });
      await tx.task.update({ where: { id: taskId }, data: { status: "COMPLETED" } });
      return ex;
    });
    await audit(actor.id, "COMPLETE", "Task", taskId, { actualBedsCreated: input.actualBedsCreated, actualPlants: input.actualPlants });
    return NextResponse.json(execution);
  } catch (error) { return apiError(error); }
}
