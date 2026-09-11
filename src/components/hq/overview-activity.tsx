import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/business";

function formatActionLabel(action: string, entityType: string): string {
  const act = action.toUpperCase();
  const ent = entityType.replace(/_/g, " ").toLowerCase();

  if (act === "CREATE") return `Created ${ent}`;
  if (act === "UPDATE") return `Updated ${ent}`;
  if (act === "DELETE") return `Deleted ${ent}`;
  if (act === "ASSIGN") return `Assigned ${ent}`;
  if (act === "APPROVE") return `Approved ${ent}`;
  if (act === "REJECT") return `Rejected ${ent}`;
  if (act === "RESOLVE") return `Resolved ${ent}`;
  return `${action} · ${entityType}`;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(date);
}

export async function OverviewActivity() {
  try {
    const logs = await prisma.auditLog.findMany({
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        actor: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    return (
      <section className="compact-card" aria-label="Recent platform activity" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="label" style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Live Operations Stream
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              Latest platform events across all estates.
            </div>
          </div>
          <Link href="/hq/system" className="btn btn-secondary btn-sm">
            Audit Trail
          </Link>
        </div>

        {logs.length === 0 ? (
          <div className="empty-state" style={{ padding: "24px 16px", textAlign: "center" }}>
            <div className="empty-state-title">No recorded events yet</div>
            <div className="empty-state-desc">Actions taken anywhere on the platform will appear here.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {logs.map((log) => (
              <div
                key={log.id}
                className="data-row hover-glow"
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "1px solid var(--hairline)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>
                    {formatActionLabel(log.action, log.entityType)}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    by {log.actor?.name ?? "System"}
                    {log.actor?.role ? ` (${log.actor.role.replace(/_/g, " ").toLowerCase()})` : ""}
                  </div>
                </div>

                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {timeAgo(log.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 12 }}>
            Complete tamper-evident compliance log
          </span>
          <Link href="/hq/system" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
            Full System Log &rarr;
          </Link>
        </div>
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
