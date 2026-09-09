import { requireSession } from "@/lib/auth";
import { OfficerSignalsConsole } from "@/components/officer-signals-console";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

export default async function OfficerReportsPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell narrow">
        <OfficerSignalsConsole />
      </main>
    </>
  );
}
