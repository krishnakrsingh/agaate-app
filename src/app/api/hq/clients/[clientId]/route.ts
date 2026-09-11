import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";

const FARM_PAGE_SIZE = 10;
const PLOT_PAGE_SIZE = 10;
const PIN_LIMIT = 200;
const TEAM_LIMIT = 50;
const HISTORY_LIMIT = 10;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const { clientId } = await params;

    const sp = request.nextUrl.searchParams;
    const farmOffset = Math.max(0, Number(sp.get("farmOffset") || 0) || 0);
    const plotOffset = Math.max(0, Number(sp.get("plotOffset") || 0) || 0);

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    const farmWhere = { clientId };

    // Files are stamped with a scalar farmId (no relation), so resolve a
    // capped id-only list first — bounded, never full farm entities.
    const farmIdRows = await prisma.farm.findMany({
      where: farmWhere,
      select: { id: true },
      take: 501,
    });
    const filesCapped = farmIdRows.length > 500;
    const farmIds = farmIdRows.slice(0, 500).map((f) => f.id);

    const [
      farmCount,
      plotCount,
      acreage,
      officerCount,
      pins,
      farms,
      plots,
      plotsTotal,
      team,
      harvests,
      incidents,
      tasks,
      cycles,
      files,
      notes,
    ] = await Promise.all([
      prisma.farm.count({ where: farmWhere }),
      prisma.plot.count({ where: { farm: farmWhere, deletedAt: null } }),
      prisma.farm.aggregate({ where: farmWhere, _sum: { totalArea: true } }),
      prisma.user.count({ where: { clientId, role: "FARM_OFFICER", active: true } }),
      // Mini-map pins: id + coords only, capped.
      prisma.farm.findMany({
        where: farmWhere,
        select: { id: true, name: true, latitude: true, longitude: true, status: true },
        orderBy: { updatedAt: "desc" },
        take: PIN_LIMIT,
      }),
      prisma.farm.findMany({
        where: farmWhere,
        select: {
          id: true,
          name: true,
          status: true,
          setupStage: true,
          totalArea: true,
          cultivableArea: true,
          boundaryGeoJson: true,
          updatedAt: true,
          _count: { select: { plots: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: FARM_PAGE_SIZE,
        skip: farmOffset,
      }),
      prisma.plot.findMany({
        where: { farm: farmWhere, deletedAt: null },
        select: {
          id: true,
          name: true,
          area: true,
          status: true,
          farmId: true,
          farm: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: PLOT_PAGE_SIZE,
        skip: plotOffset,
      }),
      prisma.plot.count({ where: { farm: farmWhere, deletedAt: null } }),
      prisma.user.findMany({
        where: { clientId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          active: true,
          farmAccess: {
            select: {
              canManage: true,
              farm: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: TEAM_LIMIT,
      }),
      prisma.harvestLog.findMany({
        where: { farm: farmWhere },
        select: {
          id: true,
          harvestDate: true,
          quantity: true,
          unit: true,
          grade: true,
          cropCycle: { select: { cropName: true } },
          farm: { select: { id: true, name: true } },
          plot: { select: { id: true, name: true } },
        },
        orderBy: { harvestDate: "desc" },
        take: HISTORY_LIMIT,
      }),
      prisma.incident.findMany({
        where: { farm: farmWhere },
        select: {
          id: true,
          type: true,
          severity: true,
          status: true,
          createdAt: true,
          farm: { select: { id: true, name: true } },
          plot: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: HISTORY_LIMIT,
      }),
      prisma.task.findMany({
        where: { farm: farmWhere },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          dueDate: true,
          updatedAt: true,
          farm: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: HISTORY_LIMIT,
      }),
      prisma.cropCycle.findMany({
        where: { plot: { farm: farmWhere } },
        select: {
          id: true,
          cropName: true,
          status: true,
          startDate: true,
          plot: {
            select: {
              id: true,
              name: true,
              farm: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: HISTORY_LIMIT,
      }),
      prisma.mediaAsset.findMany({
        where: { farmId: { in: farmIds } },
        select: {
          id: true,
          storageKey: true,
          kind: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
          farmId: true,
        },
        orderBy: { createdAt: "desc" },
        take: HISTORY_LIMIT,
      }),
      prisma.incidentFollowUp.findMany({
        where: { incident: { farm: farmWhere } },
        select: {
          id: true,
          action: true,
          remarks: true,
          createdAt: true,
          author: { select: { name: true } },
          incident: {
            select: {
              id: true,
              type: true,
              farm: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: HISTORY_LIMIT,
      }),
    ]);

    return NextResponse.json(
      {
        client: {
          id: client.id,
          code: client.code || `CLI-${client.id.slice(-4).toUpperCase()}`,
          name: client.name,
          companyName: client.companyName,
          email: client.email,
          phone: client.phone,
          secondaryContact: client.secondaryContact,
          entityType: client.entityType,
          panNumber: client.panNumber,
          gstin: client.gstin,
          billingAddress: client.billingAddress,
          address: client.address,
          state: client.state,
          district: client.district,
          status: client.status,
          createdAt: client.createdAt.toISOString(),
          updatedAt: client.updatedAt.toISOString(),
        },
        metrics: {
          farmCount,
          plotCount,
          officerCount,
          totalAcreage: Number(acreage._sum.totalArea || 0),
        },
        pins: {
          items: pins.map((p) => ({
            id: p.id,
            name: p.name,
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            status: p.status,
          })),
          hasMore: farmCount > pins.length,
        },
        farms: {
          items: farms.map((f) => ({
            id: f.id,
            name: f.name,
            status: f.status,
            setupStage: f.setupStage,
            totalArea: Number(f.totalArea),
            cultivableArea: Number(f.cultivableArea),
            plotCount: f._count.plots,
            hasBoundary: !!f.boundaryGeoJson,
            updatedAt: f.updatedAt.toISOString(),
          })),
          total: farmCount,
          limit: FARM_PAGE_SIZE,
          offset: farmOffset,
        },
        plots: {
          items: plots.map((p) => ({
            id: p.id,
            name: p.name,
            area: Number(p.area),
            status: p.status,
            farmId: p.farmId,
            farmName: p.farm.name,
          })),
          total: plotsTotal,
          limit: PLOT_PAGE_SIZE,
          offset: plotOffset,
        },
        team: team.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          active: u.active,
          farms: u.farmAccess.map((a) => ({
            id: a.farm.id,
            name: a.farm.name,
            canManage: a.canManage,
          })),
        })),
        teamCapped: team.length >= TEAM_LIMIT,
        filesCapped,
        history: {
          harvests: harvests.map((h) => ({
            id: h.id,
            date: h.harvestDate.toISOString().slice(0, 10),
            quantity: Number(h.quantity),
            unit: h.unit,
            grade: h.grade,
            crop: h.cropCycle.cropName,
            farmId: h.farm.id,
            farmName: h.farm.name,
            plotName: h.plot.name,
          })),
          incidents: incidents.map((i) => ({
            id: i.id,
            type: i.type,
            severity: i.severity,
            status: i.status,
            createdAt: i.createdAt.toISOString(),
            farmId: i.farm.id,
            farmName: i.farm.name,
            plotName: i.plot?.name || null,
          })),
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            category: t.category,
            status: t.status,
            dueDate: t.dueDate.toISOString().slice(0, 10),
            farmId: t.farm.id,
            farmName: t.farm.name,
          })),
          cycles: cycles.map((c) => ({
            id: c.id,
            cropName: c.cropName,
            status: c.status,
            startDate: c.startDate.toISOString().slice(0, 10),
            plotId: c.plot.id,
            plotName: c.plot.name,
            farmId: c.plot.farm.id,
            farmName: c.plot.farm.name,
          })),
        },
        files: files.map((f) => ({
          id: f.id,
          storageKey: f.storageKey,
          kind: f.kind,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
          farmId: f.farmId,
          createdAt: f.createdAt.toISOString(),
        })),
        notes: notes.map((n) => ({
          id: n.id,
          action: n.action,
          remarks: n.remarks,
          authorName: n.author.name,
          incidentId: n.incident.id,
          incidentType: n.incident.type,
          farmId: n.incident.farm.id,
          farmName: n.incident.farm.name,
          createdAt: n.createdAt.toISOString(),
        })),
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}
