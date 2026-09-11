import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/business";
import { OverviewAlertList, type OverviewAlert } from "@/components/hq/overview-alert-list";

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export async function OverviewAlerts() {
  try {
    const where: Prisma.IncidentWhereInput = { status: { in: ["OPEN", "ACKNOWLEDGED"] } };
    const [total, incidents] = await Promise.all([
      prisma.incident.count({ where }),
      prisma.incident.findMany({
        where,
        select: {
          id: true,
          type: true,
          severity: true,
          status: true,
          description: true,
          createdAt: true,
          farm: {
            select: {
              id: true,
              name: true,
              ownerName: true,
              client: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    // Severity is a free-form nullable string; unranked values sort last,
    // untagged incidents triage as HIGH like the operations console.
    const top: OverviewAlert[] = incidents
      .map((inc) => ({
        id: inc.id,
        type: inc.type,
        severity: inc.severity ?? "HIGH",
        description: inc.description,
        farmId: inc.farm.id,
        farmName: inc.farm.name,
        clientName: inc.farm.client?.name || inc.farm.ownerName,
        status: inc.status,
        when: formatDateTime(inc.createdAt),
        rank: SEVERITY_RANK[inc.severity ?? "HIGH"] ?? 4,
        at: inc.createdAt.getTime(),
      }))
      .sort((a, b) => a.rank - b.rank || b.at - a.at)
      .slice(0, 10)
      .map(({ id, type, severity, description, farmId, farmName, clientName, status, when }) => ({
        id,
        type,
        severity,
        description,
        farmId,
        farmName,
        clientName,
        status,
        when,
      }));

    return (
      <section className="compact-card" aria-label="Alert inbox preview">
        <div className="card-header">
          <div>
            <div className="label">Field Incident Command</div>
            <div className="muted" style={{ marginTop: 4 }}>
              {total === 0 ? "Zero open incidents across all estates." : `Top ${top.length} of ${total} open field alerts ranked by severity.`}
            </div>
          </div>
          <Link href="/hq/farms" className="btn btn-secondary btn-sm">
            View All Farms
          </Link>
        </div>
        <OverviewAlertList alerts={top} />
      </section>
    );
  } catch {
    return (
      <div className="error-banner" role="alert">
        Alert preview is temporarily unavailable. The operations inbox is unaffected.
      </div>
    );
  }
}
