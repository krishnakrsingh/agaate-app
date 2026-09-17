import { requireSession, hasPermission } from "@modules/auth";
import { InternalTeamConsole } from "@modules/people/ui/internal-team-console";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function HqPeoplePage() {
  const session = await requireSession();

  if (!hasPermission(session.permissions, "internal_team:manage")) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Headquarters", href: "/hq" }, { label: "Internal Team" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Super Admins can access the internal team directory.</p>
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
