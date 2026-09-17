import { redirect } from "next/navigation";
import { requireSession } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { ClientOnboardingWizardV2 } from "@modules/onboarding/ui/client-onboarding-wizard-v2";
import { FarmForm } from "@modules/estates/ui/farm-form";

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

  if (session.role === "SUPER_ADMIN") {
    redirect("/hq/onboarding/new");
  }

  // Farm Admin adding an additional estate to their portfolio
  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell narrow">
        <Breadcrumbs items={[{ label: "Setup New Farm" }]} />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              ESTATE EXPANSION &bull; CLIENT PORTFOLIO
            </div>
            <h1>Register Additional Farmland</h1>
            <p className="muted">
              Add a new parcel or estate to your landowner account.
            </p>
          </div>
        </div>

        <FarmForm />
      </main>
    </>
  );
}
