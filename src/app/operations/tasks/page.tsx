import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TasksQueue } from "@/components/ops/tasks-queue";

export const dynamic = "force-dynamic";

export default async function OperationsTasksPage() {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST"].includes(session.role)) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Operations" }, { label: "Tasks" }]} />
          <h1>Access Restricted</h1>
          <p className="error">You do not have permission to view the operations queue.</p>
        </main>
      </>
    );
  }
  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Operations" }, { label: "Tasks queue" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow"><span className="eyebrow-dot" />OPERATIONS • WORK QUEUE</div>
            <h1>Tasks queue</h1>
            <p className="muted">Summary first, then drill into a server-paginated queue with bulk dispatch.</p>
          </div>
        </div>
        <TasksQueue />
      </main>
    </>
  );
}
