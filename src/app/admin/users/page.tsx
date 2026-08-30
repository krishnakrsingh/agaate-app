import { requireSession } from "@/lib/auth";
import { AdminConsole } from "@/components/admin-console";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Users" }]} />
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
        <Breadcrumbs items={[{ label: "User Access Control" }]} />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              SECURITY & PERMISSIONS
            </div>
            <h1>Users & Farm Access</h1>
            <p className="muted">
              Manage Super Admins, Farm Admins, Central Agronomists, and Farm Officers across all operations.
            </p>
          </div>
        </div>

        <AdminConsole />
      </main>
    </>
  );
}
