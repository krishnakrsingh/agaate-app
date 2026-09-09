import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { TasksQueue } from "@/components/ops/tasks-queue";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Icons } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await requireSession();

  if (!["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST"].includes(session.role)) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Activities" }]} />
          <h1>Access Restricted</h1>
          <p className="error">You do not have permission to view planned activities.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell">
        <Breadcrumbs items={[{ label: "Activities" }]} />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              OPERATIONS &bull; WORK QUEUE
            </div>
            <h1>Tasks queue</h1>
            <p className="muted">
              Summary first, then drill into a server-paginated queue. Bulk dispatch is confirmed and permission-checked — never one-by-one for hundreds of rows.
            </p>
          </div>

          <Link href="/tasks/new" className="btn btn-primary">
            <Icons.Plus size={18} />
            <span>Plan New Activity</span>
          </Link>
        </div>

        <TasksQueue />
      </main>
    </>
  );
}
