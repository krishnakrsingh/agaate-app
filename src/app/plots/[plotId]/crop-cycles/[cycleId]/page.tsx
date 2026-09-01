import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Icons } from "@/components/icons";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { variance } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function CropCycleDetailPage({
  params,
}: {
  params: Promise<{ plotId: string; cycleId: string }>;
}) {
  const { plotId, cycleId } = await params;
  const session = await requireSession();

  let cycle;
  try {
    cycle = await prisma.cropCycle.findUniqueOrThrow({
      where: { id: cycleId, plotId },
      include: {
        plot: {
          include: {
            farm: { select: { id: true, name: true, location: true } },
          },
        },
        varieties: true,
        milestones: {
          orderBy: { targetDate: "asc" },
          include: {
            tasks: {
              include: {
                assignedOfficer: { select: { name: true } },
                executions: {
                  include: {
                    materials: true,
                    labour: true,
                    media: true,
                  },
                },
              },
            },
          },
        },
        monitoring: {
          orderBy: { createdAt: "desc" },
          include: {
            officer: { select: { name: true } },
            media: true,
          },
        },
        incidents: {
          orderBy: { createdAt: "desc" },
          include: {
            reporter: { select: { name: true } },
            media: true,
            followUps: true,
          },
        },
        tasks: {
          orderBy: { dueDate: "asc" },
          include: {
            assignedOfficer: { select: { name: true } },
            executions: {
              include: {
                materials: true,
                labour: true,
                media: true,
              },
            },
          },
        },
      },
    });

    await requireFarmAccess(cycle.plot.farmId);
  } catch {
    return notFound();
  }

  const plotArea = Number(cycle.plot.area);
  const bedVariance = variance(
    cycle.expectedTotalBeds ? Number(cycle.expectedTotalBeds) : null,
    cycle.actualBedsCreated ? Number(cycle.actualBedsCreated) : null
  );
  const plantVariance = variance(
    cycle.expectedPlants ? Number(cycle.expectedPlants) : null,
    cycle.actualPlants ? Number(cycle.actualPlants) : null
  );

  const canEdit =
    session.role === "SUPER_ADMIN" ||
    session.role === "FARM_ADMIN" ||
    session.role === "AGRONOMIST";

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell">
        <Breadcrumbs
          items={[
            { label: cycle.plot.farm.name, href: `/farms/${cycle.plot.farmId}` },
            { label: cycle.plot.name, href: `/plots/${cycle.plot.id}` },
            { label: cycle.cropName },
          ]}
        />

        {/* Command Header */}
        <div className="card" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <StatusBadge status={cycle.status} />
                <span className="mono-label" style={{ background: "var(--card-muted)", padding: "2px 8px", borderRadius: "var(--radius-xs)" }}>
                  {cycle.establishmentType.replaceAll("_", " ")}
                </span>
                <span className="muted" style={{ fontSize: "0.85rem" }}>
                  Plot: <strong>{cycle.plot.name}</strong> ({plotArea} acres) &bull; {cycle.plot.farm.name}
                </span>
              </div>

              <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", margin: "4px 0 6px" }}>
                🌱 {cycle.cropName}
              </h1>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {cycle.varieties.map((v) => (
                  <span
                    key={v.id}
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: "var(--radius-full)",
                      background: "var(--primary-light)",
                      color: "var(--primary)",
                      border: "1px solid var(--primary-border)",
                    }}
                  >
                    Variety: {v.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Action Shortcuts */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {canEdit && (
                <Link
                  href={`/plots/${plotId}/crop-cycles/${cycleId}/edit`}
                  className="btn btn-secondary"
                >
                  <Icons.Edit size={15} />
                  <span>Edit Crop Plan</span>
                </Link>
              )}

              {["SUPER_ADMIN", "AGRONOMIST"].includes(session.role) && (
                <Link
                  href={`/tasks/new?farmId=${cycle.plot.farmId}&plotId=${cycle.plotId}&cropCycleId=${cycle.id}`}
                  className="btn btn-primary"
                >
                  <Icons.Calendar size={15} />
                  <span>Plan Activity</span>
                </Link>
              )}

              {["SUPER_ADMIN", "FARM_OFFICER"].includes(session.role) && (
                <Link
                  href={`/officer/reports?farmId=${cycle.plot.farmId}&plotId=${cycle.plotId}&cropCycleId=${cycle.id}`}
                  className="btn btn-outline"
                >
                  <Icons.Camera size={15} />
                  <span>Record Signal</span>
                </Link>
              )}
            </div>
          </div>

          {/* Timeline Dates Strip */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              fontSize: "0.88rem",
            }}
          >
            <div>
              <span className="mono-label" style={{ display: "block" }}>Start Date</span>
              <strong>{new Date(cycle.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
            </div>

            <div>
              <span className="mono-label" style={{ display: "block" }}>Expected First Harvest</span>
              <strong>
                {cycle.expectedFirstHarvestDate
                  ? new Date(cycle.expectedFirstHarvestDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "Not specified"}
              </strong>
            </div>

            <div>
              <span className="mono-label" style={{ display: "block" }}>Milestones Configured</span>
              <strong>{cycle.milestones.length} Milestones Scheduled</strong>
            </div>

            <div>
              <span className="mono-label" style={{ display: "block" }}>Active Activities</span>
              <strong>{cycle.tasks.filter((t) => t.status !== "COMPLETED").length} Pending / In Progress</strong>
            </div>
          </div>
        </div>

        {/* Infrastructure & Variance Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {/* Bed Infrastructure Card */}
          <article className="card" style={{ margin: 0, padding: 22 }}>
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: "var(--radius-xs)", background: "var(--primary-light)", color: "var(--primary)", display: "grid", placeItems: "center" }}>
                  <Icons.Layers size={17} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Bed Infrastructure (BRD §9)</h3>
                  <small className="muted">{cycle.bedPreparationEnabled ? "Raised Bed Formation" : "No Bed Config"}</small>
                </div>
              </div>
              <span className={`status ${cycle.bedPreparationEnabled ? "active" : "inactive"}`}>
                {cycle.bedPreparationEnabled ? "ENABLED" : "DISABLED"}
              </span>
            </div>

            {cycle.bedPreparationEnabled ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.88rem" }}>
                  <div style={{ padding: "10px", background: "var(--card-muted)", borderRadius: "var(--radius-sm)" }}>
                    <span className="mono-label" style={{ display: "block" }}>Bed Width</span>
                    <strong>{cycle.bedWidthCm ? `${cycle.bedWidthCm} cm` : "—"}</strong>
                  </div>
                  <div style={{ padding: "10px", background: "var(--card-muted)", borderRadius: "var(--radius-sm)" }}>
                    <span className="mono-label" style={{ display: "block" }}>Centre-to-Centre</span>
                    <strong>{cycle.bedCenterDistanceCm ? `${cycle.bedCenterDistanceCm} cm` : "—"}</strong>
                  </div>
                </div>

                <div style={{ padding: 14, background: "var(--card-muted)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span className="muted" style={{ fontSize: "0.85rem" }}>Expected Total Beds:</span>
                    <strong style={{ fontSize: "0.95rem" }}>{cycle.expectedTotalBeds?.toString() ?? "—"} beds</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span className="muted" style={{ fontSize: "0.85rem" }}>Actual Beds Formed:</span>
                    <strong style={{ fontSize: "0.95rem" }}>{cycle.actualBedsCreated?.toString() ?? "Pending"}</strong>
                  </div>
                  {bedVariance && (
                    <div style={{ fontSize: "0.82rem", color: bedVariance.amount >= 0 ? "var(--success-text)" : "var(--danger-text)", marginTop: 6, paddingTop: 6, borderTop: "1px dashed var(--border)" }}>
                      Variance: <strong>{bedVariance.amount > 0 ? `+${bedVariance.amount}` : bedVariance.amount} beds</strong> ({bedVariance.percentage?.toFixed(1)}%)
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>Bed preparation was not configured for this crop cycle.</p>
            )}
          </article>

          {/* Mulch & Population Card */}
          <article className="card" style={{ margin: 0, padding: 22 }}>
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: "var(--radius-xs)", background: "var(--primary-light)", color: "var(--primary)", display: "grid", placeItems: "center" }}>
                  <Icons.Sprout size={17} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Mulching & Population (BRD §10-11)</h3>
                  <small className="muted">{cycle.mulchEnabled ? cycle.mulchHolePattern?.replaceAll("_", " ") : "Direct Ground"}</small>
                </div>
              </div>
              <span className={`status ${cycle.mulchEnabled ? "active" : "inactive"}`}>
                {cycle.mulchEnabled ? "MULCH ACTIVE" : "NO MULCH"}
              </span>
            </div>

            {cycle.mulchEnabled ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.88rem" }}>
                  <div style={{ padding: "10px", background: "var(--card-muted)", borderRadius: "var(--radius-sm)" }}>
                    <span className="mono-label" style={{ display: "block" }}>Hole Pattern</span>
                    <strong>{cycle.mulchHolePattern?.replaceAll("_", " ") ?? "—"}</strong>
                  </div>
                  <div style={{ padding: "10px", background: "var(--card-muted)", borderRadius: "var(--radius-sm)" }}>
                    <span className="mono-label" style={{ display: "block" }}>Plant Distance</span>
                    <strong>{cycle.plantDistanceCm ? `${cycle.plantDistanceCm} cm` : "—"}</strong>
                  </div>
                </div>

                <div style={{ padding: 14, background: "var(--card-muted)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span className="muted" style={{ fontSize: "0.85rem" }}>Expected Population:</span>
                    <strong style={{ fontSize: "0.95rem" }}>{cycle.expectedPlants?.toString() ?? "—"} plants</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span className="muted" style={{ fontSize: "0.85rem" }}>Actual Population:</span>
                    <strong style={{ fontSize: "0.95rem" }}>{cycle.actualPlants?.toString() ?? "Pending"}</strong>
                  </div>
                  {plantVariance && (
                    <div style={{ fontSize: "0.82rem", color: plantVariance.amount >= 0 ? "var(--success-text)" : "var(--danger-text)", marginTop: 6, paddingTop: 6, borderTop: "1px dashed var(--border)" }}>
                      Variance: <strong>{plantVariance.amount > 0 ? `+${plantVariance.amount}` : plantVariance.amount} plants</strong> ({plantVariance.percentage?.toFixed(1)}%)
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>Mulch film was not configured for this crop cycle.</p>
            )}
          </article>
        </div>

        {/* 4 Standard Milestones Pipeline */}
        <section className="card" style={{ padding: 22 }}>
          <div className="card-header">
            <div>
              <h3 style={{ margin: 0 }}>Crop Cycle Milestone Schedule (BRD §12)</h3>
              <p className="muted" style={{ fontSize: "0.85rem", margin: "2px 0 0" }}>
                Target timeline dates for stage completion and automated tasks.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {cycle.milestones.map((m, idx) => {
              const isDone = m.status === "COMPLETED";

              return (
                <div
                  key={m.id}
                  style={{
                    padding: "16px",
                    background: isDone ? "var(--success-light)" : "var(--card-muted)",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${isDone ? "var(--success-border)" : "var(--border)"}`,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "var(--radius-full)",
                          background: isDone ? "var(--success)" : "var(--border-strong)",
                          color: "#ffffff",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        {isDone ? "✓" : idx + 1}
                      </span>
                      <StatusBadge status={m.status} />
                    </div>

                    <strong style={{ fontSize: "0.98rem", display: "block", color: "var(--text-main)" }}>
                      {m.name}
                    </strong>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginTop: 4 }}>
                      Target: <strong>{new Date(m.targetDate).toLocaleDateString()}</strong>
                    </span>
                    {m.remarks && (
                      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "6px 0 0" }}>
                        {m.remarks}
                      </p>
                    )}
                  </div>

                  {m.completedAt && (
                    <div style={{ marginTop: 10, paddingTop: 6, borderTop: "1px solid var(--border)", fontSize: "0.75rem", color: "var(--success-text)", fontWeight: 600 }}>
                      Completed on {new Date(m.completedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Two-Column Tasks & Signals View */}
        <div className="two-column" style={{ alignItems: "start" }}>
          {/* Associated Planned Tasks */}
          <article className="card" style={{ margin: 0, padding: 22 }}>
            <div className="card-header">
              <div>
                <h3 style={{ margin: 0 }}>Cycle Field Activities ({cycle.tasks.length})</h3>
                <p className="muted" style={{ fontSize: "0.82rem", margin: "2px 0 0" }}>Dispatched agronomy and milestone tasks.</p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {cycle.tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    padding: "12px 14px",
                    background: task.status === "COMPLETED" ? "var(--card-muted)" : "var(--card)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
                    <strong style={{ fontSize: "0.95rem" }}>{task.title}</strong>
                    <div style={{ display: "flex", gap: 4 }}>
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>

                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0" }}>
                    {task.description}
                  </p>

                  <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span>Officer: <strong>{task.assignedOfficer?.name ?? "Unassigned"}</strong></span>
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}

              {!cycle.tasks.length && (
                <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>No activities planned yet for this crop cycle.</p>
              )}
            </div>
          </article>

          {/* Monitoring & Telemetry */}
          <article className="card" style={{ margin: 0, padding: 22 }}>
            <div className="card-header">
              <div>
                <h3 style={{ margin: 0 }}>Visual Monitoring Logs ({cycle.monitoring.length})</h3>
                <p className="muted" style={{ fontSize: "0.82rem", margin: "2px 0 0" }}>Daily crop health classification and field photos.</p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {cycle.monitoring.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: "12px 14px",
                    background: m.status === "POOR" ? "var(--danger-light)" : "var(--success-light)",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${m.status === "POOR" ? "var(--danger-border)" : "var(--success-border)"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: m.status === "POOR" ? "var(--danger-text)" : "var(--success-text)" }}>
                      {m.status} Health &bull; {m.stage}
                    </strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {new Date(m.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {m.impactPercent && (
                    <div style={{ fontSize: "0.82rem", color: "var(--danger-text)", marginTop: 2 }}>
                      Estimated Impact: <strong>{m.impactPercent.toString()}%</strong>
                    </div>
                  )}

                  {m.remarks && (
                    <p style={{ fontSize: "0.82rem", color: "var(--text-main)", margin: "4px 0 0" }}>
                      {m.remarks}
                    </p>
                  )}

                  <small className="muted" style={{ display: "block", marginTop: 4 }}>
                    Logged by {m.officer.name}
                  </small>
                </div>
              ))}

              {!cycle.monitoring.length && (
                <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>No daily monitoring logs recorded yet.</p>
              )}
            </div>
          </article>
        </div>
      </main>
    </>
  );
}
