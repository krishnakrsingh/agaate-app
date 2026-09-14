import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Icons } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function HqOnboardingListPage() {
  const session = await requireSession();
  if (!hasPermission(session.role, "onboarding:manage")) redirect("/dashboard");

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
        <div className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Onboarding</h1>
            {drafts.length > 0 && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--muted)",
                  background: "var(--surface-strong)",
                  padding: "2px 8px",
                  borderRadius: 12,
                }}
              >
                {drafts.length} draft{drafts.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <Link className="btn btn-primary" href="/hq/onboarding/new">
            <Icons.Plus size={15} />
            <span>New onboarding</span>
          </Link>
        </div>

        <div className="section-block">
          <div className="form-section-title">Resume a draft ({drafts.length})</div>
          {drafts.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>
              No drafts in progress. Start a new onboarding, or open the wizard — an unsent draft stored on this device is offered
              automatically on load.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {drafts.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid var(--hairline)",
                    padding: "10px 12px",
                    background: "var(--surface-card)",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ flex: 1, minWidth: 180, fontSize: 13 }}>
                    <strong>{d.clientName || "Unnamed client"}</strong>
                    <span className="muted">
                      {" "}
                      — {d.farmCount} farm{d.farmCount === 1 ? "" : "s"} — updated {new Date(d.updatedAt).toLocaleString()}
                    </span>
                  </span>
                  <Link className="btn btn-secondary btn-sm" href={`/hq/onboarding/${d.id}`}>
                    <span>Resume</span>
                    <Icons.ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
