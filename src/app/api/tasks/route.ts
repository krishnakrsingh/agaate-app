import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole, HttpError } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, paginatedJson, paginationParams } from "@/lib/api";
import { isWithinRollingSevenDays, parseUtcDate } from "@/lib/business";
import { downloadUrl } from "@/lib/storage";

const schema = z.object({
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

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    const search = request.nextUrl ? request.nextUrl.searchParams : new URL(request.url).searchParams;
    const farmId = search.get("farmId");
    const day = search.get("date");
    if (farmId) await requireFarmAccess(farmId);

    const unrestricted = actor.role === "SUPER_ADMIN" || actor.role === "AGRONOMIST";
    const { limit, offset } = paginationParams(search);
    const q = search.get("search")?.trim() || search.get("q")?.trim();
    const statusParam = search.get("status")?.trim();
    const priorityParam = search.get("priority")?.trim();
    const categoryParam = search.get("category")?.trim();
    const assigneeParam = search.get("assignedOfficerId")?.trim() || search.get("assignee")?.trim();
    const dateFrom = search.get("dateFrom") || search.get("from");
    const dateTo = search.get("dateTo") || search.get("to");

    let where: any;
    if (actor.role === "FARM_OFFICER") {
      const officerFarms = await prisma.farm.findMany({
        where: { access: { some: { userId: actor.id } } },
        select: { id: true },
      });
      const officerFarmIds = officerFarms.map((f) => f.id);

      where = {
        ...(farmId ? { farmId } : { farmId: { in: officerFarmIds } }),
        ...(day ? { dueDate: parseUtcDate(day) } : {}),
        OR: [
          { assignedOfficerId: actor.id },
          { status: "AVAILABLE", assignedOfficerId: null },
        ],
      };
    } else {
      where = {
        ...(farmId ? { farmId } : unrestricted ? {} : { farm: { access: { some: { userId: actor.id } } } }),
        ...(day ? { dueDate: parseUtcDate(day) } : {}),
      };
    }

    // Server-side queue filters — previously client-side useMemo over the
    // first 100 rows (silent data loss at scale). All optional.
    const and: any[] = [];
    if (statusParam && statusParam !== "ALL") {
      if (statusParam === "QUEUED") and.push({ status: { in: ["DRAFT", "ASSIGNED", "AVAILABLE"] } });
      else and.push({ status: statusParam });
    }
    if (priorityParam && priorityParam !== "ALL") and.push({ priority: priorityParam });
    if (categoryParam && categoryParam !== "ALL") and.push({ category: categoryParam });
    if (assigneeParam && assigneeParam !== "ALL") {
      and.push(assigneeParam === "UNASSIGNED" ? { assignedOfficerId: null } : { assignedOfficerId: assigneeParam });
    }
    if (dateFrom || dateTo) {
      const range: any = {};
      try {
        if (dateFrom) range.gte = parseUtcDate(dateFrom);
        if (dateTo) range.lte = parseUtcDate(dateTo);
      } catch { /* invalid date strings fall through to 422 via parseUtcDate in where */ }
      if (Object.keys(range).length) and.push({ dueDate: range });
    }
    if (q) {
      and.push({
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { farm: { name: { contains: q } } },
        ],
      });
    }
    if (and.length) where = { AND: [where, ...and] };

    const [rawTasks, total] = await Promise.all([
      prisma.task.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true } },
        plot: { select: { id: true, name: true } },
        cropCycle: { select: { id: true, cropName: true } },
        milestone: { select: { id: true, name: true } },
        assignedOfficer: { select: { name: true } },
        executions: {
          include: {
            media: true,
          },
        },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      take: limit,
      skip: offset,
      }),
      prisma.task.count({ where }),
    ]);

    const tasks = await Promise.all(
      rawTasks.map(async (t) => {
        const allMedia = t.executions.flatMap((e) => e.media || []);
        const mediaWithUrls = await Promise.all(
          allMedia.map(async (m) => {
            try {
              const url = await downloadUrl(m.storageKey);
              return { id: m.id, url };
            } catch {
              return { id: m.id, url: null };
            }
          })
        );
        const primaryImageUrl = mediaWithUrls.find((m) => m.url)?.url || null;
        return {
          ...t,
          primaryImageUrl,
          media: mediaWithUrls,
        };
      })
    );

    return paginatedJson(tasks, total);
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST"]);
    const input = schema.parse(await request.json());
    if (!isWithinRollingSevenDays(input.date)) throw new HttpError(422, "Agronomy activities must be planned within the rolling seven-day window.");
    await requireFarmAccess(input.farmId);
    const farm = await prisma.farm.findUniqueOrThrow({ where: { id: input.farmId }, select: { status: true } });
    if (farm.status !== "ACTIVE") throw new HttpError(422, "Agronomy activities can only be planned for an active farm.");
    const officer = await prisma.user.findUniqueOrThrow({ where: { id: input.assignedOfficerId }, select: { role: true, active: true, farmAccess: { where: { farmId: input.farmId } } } });
    if (officer.role !== "FARM_OFFICER" || !officer.active || !officer.farmAccess.length) throw new HttpError(422, "The assigned user must be an active Farm Officer assigned to this farm.");
    if (input.plotId && !(await prisma.plot.findFirst({ where: { id: input.plotId, farmId: input.farmId, deletedAt: null } }))) throw new HttpError(422, "The selected plot is not part of this farm.");
    if (input.cropCycleId && !(await prisma.cropCycle.findFirst({ where: { id: input.cropCycleId, plot: { farmId: input.farmId, deletedAt: null }, ...(input.plotId ? { plotId: input.plotId } : {}) } }))) throw new HttpError(422, "The selected crop cycle is not part of this farm and plot.");

    const task = await prisma.$transaction(async (tx) => {
      const plan = await tx.agronomyPlan.upsert({
        where: { farmId_planDate: { farmId: input.farmId, planDate: input.date } },
        update: {},
        create: { farmId: input.farmId, planDate: input.date, createdById: actor.id },
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
          createdById: actor.id,
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
            uploadedById: actor.id,
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

    let primaryImageUrl: string | null = null;
    let mediaWithUrls: Array<{ id: string; url: string | null }> = [];
    if (input.mediaIds && input.mediaIds.length > 0) {
      const mediaAssets = await prisma.mediaAsset.findMany({
        where: { id: { in: input.mediaIds } },
      });
      mediaWithUrls = await Promise.all(
        mediaAssets.map(async (m) => {
          try {
            const url = await downloadUrl(m.storageKey);
            return { id: m.id, url };
          } catch {
            return { id: m.id, url: null };
          }
        })
      );
      primaryImageUrl = mediaWithUrls.find((m) => m.url)?.url || null;
    }

    await audit(actor.id, "CREATE", "Task", task.id, {
      farmId: task.farmId,
      origin: "AGRONOMIST",
      mediaCount: input.mediaIds?.length || 0,
    });

    return NextResponse.json(
      {
        ...task,
        primaryImageUrl,
        media: mediaWithUrls,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error);
  }
}
