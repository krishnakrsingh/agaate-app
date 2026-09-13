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
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Tasks Queue</h1>

          <Link href="/tasks/new" className="btn btn-primary">
            <Icons.Plus size={15} />
            <span>Plan activity</span>
          </Link>
        </div>

        <TasksQueue />
      </main>
    </>
  );
}
