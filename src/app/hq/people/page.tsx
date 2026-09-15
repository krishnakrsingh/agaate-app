import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { PeopleDirectory } from "@/components/hq/people-directory";
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
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Internal Team</h1>
        </div>

        <PeopleDirectory currentUserId={session.userId} />
      </main>
    </>
  );
}
