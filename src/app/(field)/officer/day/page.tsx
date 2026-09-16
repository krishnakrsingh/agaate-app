import { requireSession } from "@/lib/auth";
import { OfficerDay } from "@modules/operations/ui/officer-day";
import { AttendanceForm } from "@modules/attendance/ui/attendance-form";
import { Navbar } from "@/components/navigation/navbar";

export const dynamic = "force-dynamic";

export default async function OfficerDayPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell narrow">
        <AttendanceForm />
        <OfficerDay />
      </main>
    </>
  );
}
