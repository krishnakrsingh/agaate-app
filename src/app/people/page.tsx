import { requireSession } from "@/lib/auth";
import { AdminConsole } from "@/components/admin-console";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "People & Access" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Super Admins can manage platform users and permissions.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "People & Access" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              MANAGE • PEOPLE & ACCESS GOVERNANCE
            </div>
            <h1>People & Access Management</h1>
            <p className="muted">
              Ecosystem-wide user directory across Super Admins, Farm Admins, Central Agronomists, and Farm Officers. Provision accounts, assign estate scopes, and manage access credentials.
            </p>
          </div>
        </div>

        <AdminConsole />
      </main>
    </>
  );
}
