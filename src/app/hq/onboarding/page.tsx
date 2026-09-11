import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Icons } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function HqOnboardingListPage() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

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
        <Breadcrumbs items={[{ label: "HQ", href: "/hq" }, { label: "Client onboarding" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              HQ • CLIENT ONBOARDING
            </div>
            <h1>Onboarding drafts</h1>
            <p className="muted">
              Multi-step intake for employee-assisted calls. Drafts save on this device and on the server — resume any interrupted call.
            </p>
          </div>
          <Link className="btn btn-green" href="/hq/onboarding/new">
            <Icons.Plus size={15} />
            <span>Start new onboarding</span>
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
