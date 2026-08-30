import { requireSession } from "@/lib/auth";
import { OfficerDay } from "@/components/officer-day";
import { AttendanceForm } from "@/components/attendance-form";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function OfficerDayPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell narrow">
        <Breadcrumbs items={[{ label: "My Day" }]} />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              FIELD OPERATIONS WORKSPACE &bull; {session.name}
            </div>
            <h1>Daily Field Execution</h1>
            <p className="muted">
              Record verified shift attendance and execute today&apos;s assigned agronomy operations.
            </p>
          </div>
        </div>

        <AttendanceForm />
        <OfficerDay />
      </main>
    </>
  );
}
