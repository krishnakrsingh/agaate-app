import { requireSession } from "@/lib/auth";
import { OfficerDay } from "@/components/officer-day";
import { AttendanceForm } from "@/components/attendance-form";
import { Navbar } from "@/components/navbar";

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
