import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SystemPolicyCards } from "@/components/hq/system-policy-cards";
import { SystemDataQuality, type DataQualityCounts } from "@/components/hq/system-data-quality";
import { SystemAuditExplorer } from "@/components/hq/system-audit-explorer";

export const dynamic = "force-dynamic";

// Bounded data-quality counts, computed server-side so no new API route is
// needed. Every query is a cheap indexed count; duplicate scans are capped
// with take: 50. Returns null on DB failure so the page degrades instead of
// throwing (rendered as a documented gap by SystemDataQuality).
async function loadDataQuality(): Promise<DataQualityCounts | null> {
  try {
    const [farmsMissingBoundary, usersWithoutPhone, plotsWithoutCycles, dupPhoneRows, dupEmailRows] =
      await Promise.all([
        prisma.farm.count({
          where: { OR: [{ boundaryGeoJson: null }, { boundaryGeoJson: "" }] },
        }),
        prisma.user.count({
          where: { OR: [{ phone: null }, { phone: "" }] },
        }),
        prisma.plot.count({
          where: { deletedAt: null, cropCycles: { none: {} } },
        }),
        prisma.user.groupBy({
          by: ["phone"],
          where: { phone: { not: null, notIn: [""] } },
          _count: { _all: true },
          having: { phone: { _count: { gt: 1 } } },
          orderBy: { phone: "asc" },
          take: 50,
        }),
        prisma.user.groupBy({
          by: ["email"],
          where: { email: { notIn: [""] } },
          _count: { _all: true },
          having: { email: { _count: { gt: 1 } } },
          orderBy: { email: "asc" },
          take: 50,
        }),
      ]);
    return {
      farmsMissingBoundary,
      usersWithoutPhone,
      plotsWithoutCycles,
      duplicatePhones: dupPhoneRows.length,
      duplicateEmails: dupEmailRows.length,
    };
  } catch {
    return null;
  }
}

export default async function HqSystemPage() {
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "HQ" }, { label: "System" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Super Admins can access system configuration and audit controls.</p>
        </main>
      </>
    );
  }

  const dataQuality = await loadDataQuality();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "HQ", href: "/hq" }, { label: "System" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              HQ • POLICIES, DATA QUALITY &amp; AUDIT
            </div>
            <h1>System</h1>
            <p className="muted">
              Read-only platform policies, data-quality snapshot, and the immutable audit trail.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <SystemPolicyCards />
          <SystemDataQuality data={dataQuality} />
          <SystemAuditExplorer />
        </div>
      </main>
    </>
  );
}
