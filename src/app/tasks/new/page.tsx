import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { TaskForm } from "@/components/task-form";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const session = await requireSession();

  if (!["SUPER_ADMIN", "AGRONOMIST"].includes(session.role)) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Plan Activity" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Agronomists and Super Admins can schedule agronomy activities.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell narrow">
        <Breadcrumbs items={[{ label: "Activities", href: "/tasks" }, { label: "Schedule Activity" }]} />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              AGRONOMY INTELLIGENCE &bull; 7-DAY ROLLING PLAN
            </div>
            <h1>Schedule Field Activity</h1>
            <p className="muted">
              Publish agronomy tasks for assigned Farm Officers with technical application guidance.
            </p>
          </div>
        </div>

        <TaskForm />
      </main>
    </>
  );
}
