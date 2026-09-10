import { NextRequest, NextResponse } from "next/server";
import { currentActor, accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";

/**
 * Global entity-aware search — the core "find anything" primitive at scale.
 * Bounded per-entity (never fetch-all), permission-aware via
 * accessibleFarmWhere(), debounced client-side with AbortController.
 * GET /api/search?q=...&limit=8 -> { clients, farms, users, tasks, incidents }
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    const sp = request.nextUrl.searchParams;
    const q = (sp.get("q") || sp.get("search") || "").trim();
    if (!q || q.length < 2) return NextResponse.json({ clients: [], farms: [], users: [], tasks: [], incidents: [] }, { headers: noStore });
    const per = Math.min(25, Math.max(1, Number(sp.get("limit") || 8) || 8));
    const farmScope = await accessibleFarmWhere();
    const isPlatform = actor.role === "SUPER_ADMIN" || actor.role === "AGRONOMIST";

    const [clients, farms, users, tasks, incidents] = await Promise.all([
      actor.role === "SUPER_ADMIN"
        ? prisma.client.findMany({
            where: { OR: [{ name: { contains: q } }, { code: { contains: q } }, { phone: { contains: q } }, { companyName: { contains: q } }] },
            select: { id: true, name: true, code: true, phone: true, state: true, district: true },
            take: per,
          })
        : Promise.resolve([]),
      prisma.farm.findMany({
        // One box, every way an operator identifies a farm: its own
        // name/ID/location chain, survey number, owner — or its client's
        // name/code. Bounded (take: per), never fetch-all, so this holds
        // at 1,00,000+ farms.
        where: {
          ...farmScope,
          OR: [
            { id: { contains: q } },
            { name: { contains: q } },
            { location: { contains: q } },
            { village: { contains: q } },
            { taluk: { contains: q } },
            { district: { contains: q } },
            { state: { contains: q } },
            { pincode: { contains: q } },
            { ownerName: { contains: q } },
            { surveyNumber: { contains: q } },
            { client: { name: { contains: q } } },
            { client: { code: { contains: q } } },
          ],
        },
        select: { id: true, name: true, location: true, status: true, setupStage: true, district: true, state: true, client: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: per,
      }),
      actor.role === "SUPER_ADMIN" || actor.role === "FARM_ADMIN"
        ? prisma.user.findMany({
            where: { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] },
            select: { id: true, name: true, email: true, role: true, active: true },
            take: per,
          })
        : Promise.resolve([]),
      prisma.task.findMany({
        where: {
          ...(isPlatform ? {} : actor.role === "FARM_OFFICER" ? { assignedOfficerId: actor.id } : { farm: { access: { some: { userId: actor.id } } } }),
          OR: [{ title: { contains: q } }, { description: { contains: q } }],
        },
        select: { id: true, title: true, status: true, dueDate: true, farm: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
        take: per,
      }),
      prisma.incident.findMany({
        where: { farm: farmScope, OR: [{ type: { contains: q } }, { description: { contains: q } }] },
        select: { id: true, type: true, status: true, severity: true, createdAt: true, farm: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: per,
      }),
    ]);

    return NextResponse.json(
      {
        clients: clients.map((c) => ({ ...c, href: `/clients?q=${encodeURIComponent(q)}` })),
        farms: farms.map((f) => ({ ...f, href: `/farms/${f.id}` })),
        users: users.map((u) => ({ ...u, href: `/admin/users?q=${encodeURIComponent(q)}` })),
        tasks: tasks.map((t) => ({ ...t, href: `/operations/tasks?q=${encodeURIComponent(q)}` })),
        incidents: incidents.map((i) => ({ ...i, href: `/officer/reports?q=${encodeURIComponent(q)}` })),
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}
