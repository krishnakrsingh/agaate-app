import { requireSession } from "@/lib/auth";
import { DailyReport } from "@/components/daily-report";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function DailyReportPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell">
        <Breadcrumbs items={[{ label: "Daily Operations Report" }]} />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              AUTOMATED COMPREHENSIVE INTELLIGENCE
            </div>
            <h1>Daily Operations Report</h1>
            <p className="muted">
              Projected from verified field attendance, task completions, resource usage, crop monitoring, and incident logs (BRD §30).
            </p>
          </div>
        </div>

        <DailyReport />
      </main>
    </>
  );
}
