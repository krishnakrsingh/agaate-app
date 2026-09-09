import { requireSession } from "@/lib/auth";
import { FieldReports } from "@/components/field-reports";
import { LocationRequestForm } from "@/components/location-request-form";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

export default async function OfficerReportsPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell narrow">
        <FieldReports />
        <LocationRequestForm />
      </main>
    </>
  );
}
