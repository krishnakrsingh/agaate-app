import { requireSession } from "@modules/auth";
import { FieldReports } from "@modules/incidents/ui/field-reports";
import { LocationRequestForm } from "@modules/estates/ui/location-request-form";
import { Navbar } from "@/components/navigation/navbar";

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
