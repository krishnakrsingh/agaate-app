import { Suspense } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TasksQueue } from "@/components/ops/tasks-queue";
import { Icons } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function OwnerOperationsPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Operations" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              ESTATE • WORK ORDERS &amp; TASKS
            </div>
            <h1>Farm Operations</h1>
            <p className="muted">
              Active field activities, scheduled fertigation, crop protection tasks, and execution progress across your plots.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/owner/calendar" className="btn btn-secondary btn-sm">
              <Icons.Calendar size={14} />
              <span>Ops Calendar</span>
            </Link>
            <Link href="/tasks/new" className="btn btn-primary btn-sm">
              <Icons.Plus size={14} />
              <span>Schedule Activity</span>
            </Link>
          </div>
        </div>

        <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>Loading farm operations…</div>}>
          <TasksQueue />
        </Suspense>
      </main>
    </>
  );
}
