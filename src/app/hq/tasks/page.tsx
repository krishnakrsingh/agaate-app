import { requireSession } from "@/lib/auth";
import { HqTasksLedger } from "@/components/hq/tasks-ledger";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function HqTasksPage() {
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "HQ Tasks" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Super Admins can access the HQ task ledger.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "HQ" }, { label: "Tasks" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              HQ &bull; PLATFORM TASK LEDGER
            </div>
            <h1>Tasks</h1>
            <p className="muted">
              Every task on the platform, server-paginated. Filter to a farm, client, or officer, act on one task in the drawer or on dozens via bulk dispatch.
            </p>
          </div>
        </div>

        <HqTasksLedger />
      </main>
    </>
  );
}
