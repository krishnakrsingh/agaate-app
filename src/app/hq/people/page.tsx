import { requireSession } from "@/lib/auth";
import { PeopleDirectory } from "@/components/hq/people-directory";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function HqPeoplePage() {
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "HQ People" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Super Admins can access the HQ people directory.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "HQ", href: "/hq" }, { label: "People" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              HQ • PEOPLE DIRECTORY
            </div>
            <h1>People</h1>
            <p className="muted">
              Platform accounts, roles, and estate access. For daily muster, use Attendance.
            </p>
          </div>
        </div>

        <PeopleDirectory currentUserId={session.userId} />
      </main>
    </>
  );
}
