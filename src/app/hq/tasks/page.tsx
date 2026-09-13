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
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Tasks Ledger</h1>
        </div>

        <HqTasksLedger />
      </main>
    </>
  );
}
