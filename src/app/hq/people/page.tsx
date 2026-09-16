import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { InternalTeamConsole } from "@/components/hq/internal-team-console";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function HqPeoplePage() {
  const session = await requireSession();

  if (!hasPermission(session.permissions, "internal_team:manage")) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Internal Team" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Super Admins can access the HQ internal team directory.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <div className="dir-root">
          <header className="dir-header">
            <div className="dir-header-text">
              <h1 className="dir-title">Internal Team</h1>
              <p className="dir-subtitle">Manage Agaate staff, roles and estate access.</p>
            </div>
          </header>

          <InternalTeamConsole currentUserId={session.userId} />
        </div>
      </main>
    </>
  );
}
