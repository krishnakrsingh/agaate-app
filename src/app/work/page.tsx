import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TasksQueue } from "@/components/ops/tasks-queue";
import Link from "next/link";
import { Icons } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Work Management" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              OPERATE • PLATFORM WORK MANAGEMENT
            </div>
            <h1>Work & Operations Queue</h1>
            <p className="muted">
              Live operational work engine. Manage task assignments, due dates, execution progress, and bulk status updates across all agricultural estates.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/tasks/new" className="btn btn-primary btn-sm">
              <Icons.Plus size={14} />
              <span>Schedule New Activity</span>
            </Link>
          </div>
        </div>

        <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>Loading work queues…</div>}>
          <TasksQueue />
        </Suspense>
      </main>
    </>
  );
}
