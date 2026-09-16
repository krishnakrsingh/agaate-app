import { Suspense } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { TasksQueue } from "@modules/operations/ui/tasks-queue";
import { Icons } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function OwnerOperationsPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Farm Operations</h1>

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
