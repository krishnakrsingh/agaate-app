import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { WorkforceAttendanceConsole } from "@/components/workforce-attendance-console";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Attendance" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Super Admins can view platform-wide attendance.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Attendance" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              OPERATIONS • DAILY ATTENDANCE
            </div>
            <h1>Field Attendance</h1>
            <p className="muted">
              Daily muster across estates. Pick one estate to load its roster — platform-wide loads are disabled at scale.
            </p>
          </div>
        </div>

        <WorkforceAttendanceConsole initialRole="SUPER_ADMIN" />
      </main>
    </>
  );
}
