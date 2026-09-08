import { NextRequest, NextResponse } from "next/server";
import { currentActor, accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    const searchParams = request.nextUrl.searchParams;

    const farmId = searchParams.get("farmId");
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month"); // 1-12

    const now = new Date();
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

    // Boundary for calendar: from 7 days before month start to 7 days after month end to cover calendar grid bleed
    const startDate = new Date(Date.UTC(year, month - 1, 1 - 7, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 7, 23, 59, 59));

    const farmWhere = await accessibleFarmWhere();
    let accessibleFarms = await prisma.farm.findMany({
      where: farmWhere,
      select: { id: true, name: true },
    });

    if (accessibleFarms.length === 0) {
      return NextResponse.json({ tasks: [], incidents: [], harvests: [] });
    }

    const targetFarmId = farmId && accessibleFarms.some((f) => f.id === farmId)
      ? farmId
      : accessibleFarms[0].id;

    const [tasks, incidents, harvests] = await Promise.all([
      prisma.task.findMany({
        where: {
          farmId: targetFarmId,
          dueDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          plot: { select: { id: true, name: true } },
          cropCycle: { select: { id: true, cropName: true } },
          assignedOfficer: { select: { id: true, name: true, phone: true } },
          executions: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              completedAt: true,
              remarks: true,
              labour: { select: { labourers: true, hours: true, labourHours: true } },
              materials: { select: { materialName: true, quantity: true, unit: true } },
            },
          },
        },
        orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      }),

      prisma.incident.findMany({
        where: {
          farmId: targetFarmId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          plot: { select: { id: true, name: true } },
          cropCycle: { select: { id: true, cropName: true } },
          reporter: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.harvestLog.findMany({
        where: {
          farmId: targetFarmId,
          harvestDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          plot: { select: { id: true, name: true } },
          cropCycle: { select: { id: true, cropName: true } },
        },
        orderBy: { harvestDate: "desc" },
      }),
    ]);

    const serializedTasks = tasks.map((t) => ({
      id: t.id,
      farmId: t.farmId,
      plotName: t.plot?.name || "All Farm",
      cropName: t.cropCycle?.cropName || null,
      title: t.title,
      description: t.description,
      instructions: t.instructions,
      category: t.category,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate.toISOString().split("T")[0],
      assignedOfficer: t.assignedOfficer ? {
        id: t.assignedOfficer.id,
        name: t.assignedOfficer.name,
        phone: t.assignedOfficer.phone,
      } : null,
      executions: t.executions.map((e) => ({
        id: e.id,
        status: e.status,
        completedAt: e.completedAt ? e.completedAt.toISOString() : null,
        remarks: e.remarks,
        labourHours: e.labour.reduce((sum, l) => sum + Number(l.labourHours), 0),
        materials: e.materials.map((m) => `${m.materialName} (${m.quantity} ${m.unit})`).join(", "),
      })),
    }));

    const serializedIncidents = incidents.map((i) => ({
      id: i.id,
      farmId: i.farmId,
      plotName: i.plot?.name || "Farm Wide",
      cropName: i.cropCycle?.cropName || null,
      level: i.level,
      type: i.type,
      description: i.description,
      severity: i.severity || "MEDIUM",
      impactPercent: i.impactPercent ? Number(i.impactPercent) : null,
      status: i.status,
      date: i.createdAt.toISOString().split("T")[0],
      createdAt: i.createdAt.toISOString(),
      reporter: {
        id: i.reporter.id,
        name: i.reporter.name,
        phone: i.reporter.phone,
      },
    }));

    const serializedHarvests = harvests.map((h) => ({
      id: h.id,
      farmId: h.farmId,
      plotName: h.plot?.name || "Plot",
      cropName: h.cropCycle?.cropName || "Crop",
      date: h.harvestDate.toISOString().split("T")[0],
      quantity: Number(h.quantity),
      unit: h.unit,
      grade: h.grade,
      buyerOrMarket: h.buyerOrMarket,
      totalAmount: h.totalAmount ? Number(h.totalAmount) : null,
    }));

    return NextResponse.json({
      farmId: targetFarmId,
      year,
      month,
      tasks: serializedTasks,
      incidents: serializedIncidents,
      harvests: serializedHarvests,
    });
  } catch (error) {
    return apiError(error);
  }
}
