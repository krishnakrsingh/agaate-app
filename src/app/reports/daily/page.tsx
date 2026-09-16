import { requireSession } from "@/lib/auth";
import { DailyReport } from "@modules/reporting/ui/daily-report";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function DailyReportPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell">
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Daily Operations Report</h1>
        </div>

        <DailyReport />
      </main>
    </>
  );
}
