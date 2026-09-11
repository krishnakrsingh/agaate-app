import { NextRequest, NextResponse } from "next/server";
import { accessibleFarmWhere, currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, paginatedJson } from "@/lib/api";

export const dynamic = "force-dynamic";

// HQ incident command list. Array body + X-Total-Count header (see
// paginatedJson). Every filter runs in the DB where-clause; one page of at
// most HQ_INCIDENT_PAGE_SIZE rows per request — never fetch-all.
export const HQ_INCIDENT_PAGE_SIZE = 25;

// Escalation policy: an open P0 older than this is SLA-breached.
export const P0_SLA_HOURS = 24;

// Severity mapping: P0 = CRITICAL, P1 = HIGH, P2 = MEDIUM / LOW / unset.
function pClassOf(severity: string | null): "P0" | "P1" | "P2" {
  if (severity === "CRITICAL") return "P0";
  if (severity === "HIGH") return "P1";
  return "P2";
}

function severityFilter(raw: string | null): { in?: string[]; includeNull?: boolean } | null {
  if (!raw || raw === "ALL") return null;
  const v = raw.trim().toUpperCase();
  if (v === "P0") return { in: ["CRITICAL"] };
  if (v === "P1") return { in: ["HIGH"] };
  if (v === "P2") return { in: ["MEDIUM", "LOW"], includeNull: true };
  if (["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(v)) return { in: [v] };
  return null;
}

const STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED", "CLOSED"] as const;

function ageLabel(createdAt: Date, now: number): { days: number; hours: number; label: string } {
  const ms = Math.max(0, now - createdAt.getTime());
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  if (hours < 1) return { days, hours, label: `${Math.max(1, Math.floor(ms / 60000))}m` };
  if (hours < 48) return { days, hours, label: `${hours}h` };
  return { days, hours, label: `${days}d` };
}

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST"]);
    const farmScope = await accessibleFarmWhere();

    const sp = request.nextUrl.searchParams;

    let limit = HQ_INCIDENT_PAGE_SIZE;
    const rawLimit = sp.get("limit");
    if (rawLimit != null) {
      const n = Number(rawLimit);
      if (!Number.isInteger(n) || n < 1 || n > HQ_INCIDENT_PAGE_SIZE) {
        return NextResponse.json(
          { error: `limit must be an integer between 1 and ${HQ_INCIDENT_PAGE_SIZE}.` },
          { status: 422 }
        );
      }
      limit = n;
    }
    const rawOffset = sp.get("offset");
    let offset = 0;
    if (rawOffset != null) {
      const n = Number(rawOffset);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json({ error: "offset must be a non-negative integer." }, { status: 422 });
      }
      offset = n;
    }

    const severityParam = sp.get("severity");
    const statusParam = sp.get("status")?.trim().toUpperCase();
    const typeParam = sp.get("type")?.trim();
    const farmIdParam = sp.get("farmId")?.trim();
    const clientIdParam = sp.get("clientId")?.trim();
    const farmQuery = sp.get("farmQuery")?.trim() || sp.get("farm")?.trim();
    const search = sp.get("search")?.trim() || sp.get("q")?.trim();
    const fromRaw = sp.get("from")?.trim() || sp.get("dateFrom")?.trim();
    const toRaw = sp.get("to")?.trim() || sp.get("dateTo")?.trim();
    const sort = (sp.get("sort")?.trim() || "severity").toLowerCase();
    const sortMode = sort === "newest" || sort === "oldest" ? sort : "severity";

    const farmAnd: any[] = [farmScope];
    if (farmIdParam) farmAnd.push({ id: farmIdParam });
    if (clientIdParam) farmAnd.push({ clientId: clientIdParam });
    if (farmQuery) {
      farmAnd.push({
        OR: [
          { name: { contains: farmQuery } },
          { location: { contains: farmQuery } },
          { client: { name: { contains: farmQuery } } },
        ],
      });
    }

    const where: any = { farm: farmAnd.length === 1 ? farmAnd[0] : { AND: farmAnd } };

    const sev = severityFilter(severityParam);
    if (sev) {
      where.severity = sev.includeNull ? { in: sev.in } : { in: sev.in };
      if (sev.includeNull) {
        where.OR = [{ severity: { in: sev.in } }, { severity: null }];
      }
    }
    if (statusParam && (STATUSES as readonly string[]).includes(statusParam)) {
      where.status = statusParam;
    }
    if (typeParam) {
      where.AND = [...(where.AND || []), { type: { contains: typeParam } }];
    }
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { id: { contains: search } },
            { type: { contains: search } },
            { description: { contains: search } },
            { reporter: { name: { contains: search } } },
          ],
        },
      ];
    }
    const from = fromRaw ? new Date(fromRaw) : null;
    const to = toRaw ? new Date(toRaw) : null;
    const range: any = {};
    if (from && !isNaN(from.getTime())) range.gte = from;
    if (to && !isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      range.lte = to;
    }
    if (Object.keys(range).length) where.createdAt = range;

    const orderBy =
      sortMode === "newest"
        ? [{ createdAt: "desc" as const }, { id: "desc" as const }]
        : sortMode === "oldest"
          ? [{ createdAt: "asc" as const }, { id: "asc" as const }]
          : [
              { severity: { sort: "asc" as const, nulls: "last" as const } },
              { createdAt: "desc" as const },
              { id: "desc" as const },
            ];

    const [total, rows] = await Promise.all([
      prisma.incident.count({ where }),
      prisma.incident.findMany({
        where,
        select: {
          id: true,
          type: true,
          severity: true,
          status: true,
          farmId: true,
          createdAt: true,
          updatedAt: true,
          farm: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
          plot: { select: { id: true, name: true } },
          cropCycle: { select: { id: true, cropName: true } },
          reporter: { select: { id: true, name: true, role: true } },
          _count: { select: { followUps: true } },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
    ]);

    const now = Date.now();
    const data = rows.map((r) => {
      const pClass = pClassOf(r.severity);
      const age = ageLabel(r.createdAt, now);
      const open = r.status === "OPEN" || r.status === "ACKNOWLEDGED";
      return {
        id: r.id,
        type: r.type,
        severity: r.severity || "MEDIUM",
        pClass,
        status: r.status,
        farmId: r.farmId,
        farmName: r.farm.name,
        clientName: r.farm.client?.name || null,
        plotName: r.plot?.name || null,
        cropName: r.cropCycle?.cropName || null,
        reporterId: r.reporter.id,
        reporterName: r.reporter.name,
        reporterRole: r.reporter.role,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        ageDays: age.days,
        ageLabel: age.label,
        slaBreached: pClass === "P0" && open && age.hours > P0_SLA_HOURS,
        followUpCount: r._count.followUps,
      };
    });

    return paginatedJson(data, total);
  } catch (error) {
    return apiError(error);
  }
}
