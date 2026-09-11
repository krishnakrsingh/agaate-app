import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/business";

export async function OverviewActivity() {
  try {
    const logs = await prisma.auditLog.findMany({
      select: {
        action: true,
        entityType: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    return (
      <section className="compact-card" aria-label="Recent activity">
        <div className="card-header">
          <div>
            <div className="label">Recent activity</div>
            <div className="muted" style={{ marginTop: 4 }}>
              {logs.length === 0 ? "No recorded actions yet." : "Latest platform actions across all estates."}
            </div>
          </div>
          <Link href="/hq/system" className="btn btn-secondary btn-sm">
            View audit trail
          </Link>
        </div>
        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Nothing recorded yet</div>
            <div className="empty-state-desc">Actions taken anywhere on the platform will appear here.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {logs.map((log, index) => (
              <div key={`${log.action}-${log.entityType}-${log.createdAt.toISOString()}-${index}`} className="data-row">
                <div>
                  <div style={{ fontWeight: 500, color: "var(--ink)" }}>
                    {log.action} &middot; {log.entityType}
                  </div>
                  <div className="muted" style={{ fontSize: 14 }}>
                    {log.actor?.name ?? "System"} &middot; {formatDateTime(log.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  } catch {
    return (
      <div className="error-banner" role="alert">
        Recent activity is temporarily unavailable. The audit trail itself is unaffected.
      </div>
    );
  }
}
