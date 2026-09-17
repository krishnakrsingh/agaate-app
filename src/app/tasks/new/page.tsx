import Link from "next/link";
import { requireSession } from "@modules/auth";
import { TaskForm } from "@modules/operations/ui/task-form";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams?: Promise<{
    farmId?: string;
    plotId?: string;
    cropCycleId?: string;
    date?: string;
  }>;
}) {
  const session = await requireSession();
  const params = searchParams ? await searchParams : undefined;

  if (!["SUPER_ADMIN", "AGRONOMIST", "FARM_ADMIN"].includes(session.role)) {
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

        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Schedule Field Activity</h1>
        </div>

        <TaskForm
          initialFarmId={params?.farmId}
          initialPlotId={params?.plotId}
          initialCropCycleId={params?.cropCycleId}
          initialDate={params?.date}
        />
      </main>
    </>
  );
}
