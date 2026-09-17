import { requireSession } from "@modules/auth";
import { HqTasksLedger } from "@modules/operations/ui/tasks-ledger";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

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
        <div className="dir-root">
          <header className="dir-header">
            <div className="dir-header-text">
              <h1 className="dir-title">Tasks</h1>
              <p className="dir-subtitle">One ledger for every task across farms, plots and officers.</p>
            </div>
          </header>

          <HqTasksLedger />
        </div>
      </main>
    </>
  );
}
