import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navigation/navbar";
import { Icons } from "@/components/icons";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function HqOnboardingListPage() {
  const session = await requireSession();
  if (!hasPermission(session.permissions, "onboarding:manage")) redirect("/dashboard");

  const drafts = await prisma.onboardingDraft.findMany({
    where: { createdById: session.userId, status: "DRAFT" },
    select: { id: true, clientName: true, farmCount: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <div className="dir-root">
          <header className="dir-header">
            <div className="dir-header-text">
              <h1 className="dir-title">Onboarding</h1>
              <p className="dir-subtitle">Resume client onboarding drafts or start a new estate setup.</p>
            </div>
            <Link href="/hq/onboarding/new" className="btn btn-primary btn-sm dir-add-btn">
              <Icons.Plus size={14} />
              <span>Add Client</span>
            </Link>
          </header>

          {drafts.length > 0 && (
            <div className="dir-count">
              <strong>{drafts.length}</strong> draft{drafts.length === 1 ? "" : "s"} in progress
            </div>
          )}

          {drafts.length === 0 ? (
            <div className="dir-table-card">
              <div className="dir-state-cell">
                <div className="dir-state-title">No drafts in progress</div>
                <p className="dir-state-hint">
                  Start a new onboarding. An unsent draft stored on this device is offered automatically on load.
                </p>
                <Link href="/hq/onboarding/new" className="btn btn-primary btn-sm">
                  New onboarding
                </Link>
              </div>
            </div>
          ) : (
            <div className="dir-table-card">
              <div className="dir-table-scroll">
                <table className="dir-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th className="dir-num">Farms</th>
                      <th>Created</th>
                      <th>Last edited</th>
                      <th style={{ textAlign: "right" }} aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.map((d) => (
                      <tr key={d.id} className="dir-row">
                        <td>
                          <div className="dir-identity">
                            <span className="dir-name">{d.clientName || "Unnamed client"}</span>
                            <span className="dir-code">{d.id}</span>
                          </div>
                        </td>
                        <td className="dir-num">
                          {d.farmCount}
                          <span className="dir-farms-unit">
                            {d.farmCount === 1 ? "farm" : "farms"}
                          </span>
                        </td>
                        <td className="dir-muted">{formatDate(d.createdAt)}</td>
                        <td title={d.updatedAt.toLocaleString()}>{formatDate(d.updatedAt)}</td>
                        <td style={{ textAlign: "right" }}>
                          <Link
                            href={`/hq/onboarding/${d.id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ gap: 4 }}
                          >
                            <span>Resume</span>
                            <Icons.ArrowRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
