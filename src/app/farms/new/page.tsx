import { requireSession } from "@/lib/auth";
import { FarmForm } from "@/components/farm-form";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function NewFarmPage() {
  const session = await requireSession();

  if (!["SUPER_ADMIN", "FARM_ADMIN"].includes(session.role)) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "New Farm" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Farm Admins and Super Admins can register new farm properties.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell narrow">
        <Breadcrumbs items={[{ label: "Setup New Farm" }]} />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              PROPERTY ONBOARDING &bull; SETUP PHASE
            </div>
            <h1>Create Farm Record</h1>
            <p className="muted">
              A farm remains in SETUP mode until at least one plot and planned crop cycle with all 4 milestones is configured.
            </p>
          </div>
        </div>

        <FarmForm />
      </main>
    </>
  );
}
