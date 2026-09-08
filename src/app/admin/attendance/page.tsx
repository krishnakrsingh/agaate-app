import { requireSession } from "@/lib/auth";
import { WorkforceAttendanceConsole } from "@/components/workforce-attendance-console";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function WorkforceAttendancePage() {
  const session = await requireSession();

  if (!["SUPER_ADMIN", "FARM_ADMIN"].includes(session.role)) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Workforce & Attendance" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Farm Administrators and Super Admins can monitor workforce attendance telemetry.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell">
        <Breadcrumbs items={[{ label: "Field Operations" }, { label: "Workforce & Attendance" }]} />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              FIELD PRESENCE &amp; MUSTER TELEMETRY
            </div>
            <h1 className="page-title">Workforce Attendance &amp; Field Muster</h1>
            <p className="muted">
              Live estate attendance, geofence boundary verification, shift duration tracking, and selfie photographic validation.
            </p>
          </div>
        </div>

        <WorkforceAttendanceConsole initialRole={session.role} />
      </main>
    </>
  );
}
