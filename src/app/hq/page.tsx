import { Suspense } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OverviewKpis } from "@/components/hq/overview-kpis";
import { OverviewFunnel } from "@/components/hq/overview-funnel";
import { OverviewAlerts } from "@/components/hq/overview-alerts";
import { OverviewActivity } from "@/components/hq/overview-activity";

export const dynamic = "force-dynamic";

function Loading({ label }: { label: string }) {
  return (
    <div className="muted" style={{ padding: "24px", textAlign: "center" }}>
      Loading {label}…
    </div>
  );
}

export default async function HqOverviewPage() {
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "HQ Overview" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Super Admins can view the HQ overview.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "HQ", href: "/hq" }, { label: "Command Center" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              HQ &middot; COMMAND CENTER
            </div>
            <h1>Command Center</h1>
            <p className="muted" style={{ marginTop: 4 }}>
              Operational telemetry across 1.26M acres &middot; 25,036 estates &middot; 33 field officers. Every metric links directly to action.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/hq/onboarding/new" className="btn btn-primary btn-sm">
              + New Client Onboarding
            </Link>
            <Link href="/hq/map" className="btn btn-secondary btn-sm">
              Spatial GIS Console
            </Link>
          </div>
        </div>

        <Suspense fallback={<Loading label="platform metrics" />}>
          <OverviewKpis />
        </Suspense>

        <Suspense fallback={<Loading label="onboarding funnel" />}>
          <OverviewFunnel />
        </Suspense>

        <Suspense fallback={<Loading label="alert inbox preview" />}>
          <OverviewAlerts />
        </Suspense>

        <section className="compact-card" aria-label="Platform spatial console">
          <div className="card-header" style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="label">Spatial GIS Console &amp; Cadastral Boundaries</div>
                <span className="badge badge-amber" style={{ fontSize: 11 }}>25,006 Estates Need Walk</span>
              </div>
              <div className="muted" style={{ marginTop: 4, maxWidth: 700 }}>
                High-performance spatial console managing 1.26M acres across India. Inspect farm perimeters, plot demarcations, and perimeter-walk tracks in real time.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Link href="/hq/map" className="btn btn-primary btn-sm">
                Launch GIS Console &rarr;
              </Link>
            </div>
          </div>
        </section>

        <Suspense fallback={<Loading label="recent activity" />}>
          <OverviewActivity />
        </Suspense>
      </main>
    </>
  );
}
