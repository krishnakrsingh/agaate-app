"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { StatusBadge } from "@/components/ui/badge";

type Farm = {
  id: string;
  name: string;
  location: string;
  totalArea: string;
  cultivableArea: string;
  plots: {
    id: string;
    name: string;
    cropCycles: { id: string; cropName: string; status: string; startDate: string }[];
  }[];
};

interface OwnerCockpitProps {
  initialFarms: Farm[];
}

export function OwnerCockpit({ initialFarms }: OwnerCockpitProps) {
  const [farms] = useState<Farm[]>(initialFarms);
  // If owner has multiple farms, default to "ALL" aggregated portfolio view; otherwise the single farm
  const [selectedFarmId, setSelectedFarmId] = useState<string>(
    initialFarms.length > 1 ? "ALL" : initialFarms[0]?.id || ""
  );
  const [farmSearch, setFarmSearch] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [harvests, setHarvests] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<{ totalBurn: number; categorySums: any[] }>({
    totalBurn: 0,
    categorySums: [],
  });
  const [musters, setMusters] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAll = selectedFarmId === "ALL";
  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || null;

  useEffect(() => {
    setLoading(true);
    const query = isAll ? "" : `?farmId=${selectedFarmId}`;

    const fetches: Promise<any>[] = [
      fetch(`/api/tasks${query}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/harvest${query}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/expenses${query}`).then((r) => (r.ok ? r.json() : { totalBurn: 0, categorySums: [] })),
      fetch(`/api/crew${query}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/incidents${query}`).then((r) => (r.ok ? r.json() : [])),
    ];

    if (!isAll && selectedFarmId) {
      fetches.push(
        fetch(`/api/reports/daily?farmId=${selectedFarmId}`).then((r) => (r.ok ? r.json() : null))
      );
    } else if (farms[0]?.id) {
      fetches.push(
        fetch(`/api/reports/daily?farmId=${farms[0].id}`).then((r) => (r.ok ? r.json() : null))
      );
    }

    Promise.all(fetches)
      .then(([tData, hData, eData, mData, iData, rData]) => {
        setTasks(tData || []);
        setHarvests(hData || []);
        setExpenses(eData || { totalBurn: 0, categorySums: [] });
        setMusters(mData || []);
        setIncidents(iData || []);
        if (rData?.monitoringPhotos) {
          setRecentPhotos(rData.monitoringPhotos);
        } else {
          setRecentPhotos([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load estate telemetry", err);
      })
      .finally(() => setLoading(false));
  }, [selectedFarmId, isAll, farms]);

  // Telemetry aggregates
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const pendingTasks = tasks.filter((t) => t.status !== "COMPLETED");
  const progressPercent = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const totalHarvestKg = harvests.reduce((acc, h) => acc + Number(h.quantity || 0), 0);
  const totalRevenue = harvests.reduce((acc, h) => acc + Number(h.totalAmount || 0), 0);

  const activeIncidents = incidents.filter((i) => i.status !== "RESOLVED");

  // Sum total acreage
  const scopeTotalArea = isAll
    ? farms.reduce((acc, f) => acc + Number(f.totalArea || 0), 0)
    : Number(selectedFarm?.totalArea || 0);

  const scopeCultivableArea = isAll
    ? farms.reduce((acc, f) => acc + Number(f.cultivableArea || 0), 0)
    : Number(selectedFarm?.cultivableArea || 0);

  const scopeTotalPlots = isAll
    ? farms.reduce((acc, f) => acc + f.plots.length, 0)
    : (selectedFarm?.plots.length || 0);

  // Workforce total on site today
  const totalWorkersToday = musters.reduce((acc, m) => acc + Number(m.totalLabourers || 0), 0);

  // Per-farm breakdown matrix for multi-farm owner view
  const estateMatrix = useMemo(() => {
    return farms.map((f) => {
      const fTasks = tasks.filter((t) => t.farmId === f.id || t.farm?.id === f.id);
      const fDone = fTasks.filter((t) => t.status === "COMPLETED").length;
      const fPercent = fTasks.length ? Math.round((fDone / fTasks.length) * 100) : 0;
      const fMuster = musters.find((m) => m.farmId === f.id || m.farm?.id === f.id);
      const fOpenIncidents = incidents.filter(
        (i) => (i.farmId === f.id || i.farm?.id === f.id) && i.status !== "RESOLVED"
      );
      const fActiveCrops = Array.from(
        new Set(
          f.plots.flatMap((p) =>
            p.cropCycles.filter((c) => c.status === "ACTIVE").map((c) => c.cropName)
          )
        )
      );

      return {
        farm: f,
        tasksCount: fTasks.length,
        doneCount: fDone,
        progressPercent: fPercent,
        musterCount: fMuster ? fMuster.totalLabourers : 0,
        openIncidentsCount: fOpenIncidents.length,
        activeCrops: fActiveCrops,
      };
    });
  }, [farms, tasks, musters, incidents]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* ── 1. OWNER COMMAND HEADER & MULTI-ESTATE SWITCHER ── */}
      <div className="page-header" style={{ paddingBottom: 16 }}>
        <div className="page-header-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>
              {isAll
                ? `PORTFOLIO COMMAND • ${farms.length} ESTATES`
                : `ESTATE COCKPIT • ${selectedFarm?.location || "FIELD COMMAND"}`}
            </span>
          </div>
          <h1 className="page-title">
            {isAll ? "Multi-Estate Agricultural Portfolio" : selectedFarm?.name}
          </h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: 720 }}>
            {isAll
              ? `Executive rollup across all ${farms.length} managed client estates: combined workforce muster, daily operational pace, land utilization, and crop yield.`
              : `Live field command: on-site workforce presence, parcel phenology, harvest volume, and monthly budget burn.`}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", alignSelf: "flex-start" }}>
          {/* Multi-Estate Selector */}
          {farms.length > 1 && (
            <div style={{ minWidth: 240, position: "relative" }}>
              <label className="mono-label" style={{ display: "block", marginBottom: 4, fontSize: "11px" }}>
                Active Estate View
              </label>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="input-field"
                style={{
                  fontWeight: 600,
                  fontSize: "13px",
                  borderColor: isAll ? "var(--green)" : undefined,
                  background: isAll ? "var(--stone)" : "var(--canvas)",
                }}
              >
                <option value="ALL">
                  ★ All Estates Portfolio Rollup ({farms.length} Estates)
                </option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.location})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* WhatsApp & Daily Briefing Quick Jump */}
          <Link
            href="/owner/reports/brief"
            className="btn btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-end",
              height: 38,
            }}
          >
            <Icons.FileText size={14} />
            <span>Executive Brief &amp; WhatsApp</span>
          </Link>
        </div>
      </div>

      {/* ── 2. EXECUTIVE TELEMETRY ROW ── */}
      <div className="metric-summary-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="metric-summary-item">
          <span className="metric-label">Land Under Management</span>
          <div className="metric-value" style={{ color: "var(--ink)" }}>
            {scopeCultivableArea.toFixed(1)}{" "}
            <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--muted)" }}>
              / {scopeTotalArea.toFixed(1)} Ac
            </span>
          </div>
          <div className="metric-sub">
            {scopeTotalPlots} active demarcated parcels
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Today&apos;s Field Muster</span>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            {totalWorkersToday > 0 ? `${totalWorkersToday} Workers` : "0 Logged"}
          </div>
          <div className="metric-sub">
            {isAll
              ? `Across ${farms.length} estate crews today`
              : musters[0]?.contractorName
              ? `Contractor: ${musters[0].contractorName}`
              : "Field operations on site"}
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Operations Pulse</span>
          <div className="metric-value">{progressPercent}%</div>
          <div className="metric-sub">
            {completedTasks} of {tasks.length} operations finished
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Harvested Output</span>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            {totalHarvestKg > 0 ? `${totalHarvestKg.toLocaleString()} kg` : "0 kg"}
          </div>
          <div className="metric-sub">
            {totalRevenue > 0 ? `Est. ₹${totalRevenue.toLocaleString()}` : "Harvest in progress"}
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Operating Spend (MTD)</span>
          <div className="metric-value" style={{ color: "var(--ink)" }}>
            ₹{expenses.totalBurn ? expenses.totalBurn.toLocaleString() : "0"}
          </div>
          <div className="metric-sub">Month-to-Date farm burn</div>
        </div>

        {/* Active Incidents Alert Item */}
        <div
          className="metric-summary-item"
          style={{
            borderColor: activeIncidents.length > 0 ? "var(--red-light)" : undefined,
            background: activeIncidents.length > 0 ? "var(--red-light)" : undefined,
          }}
        >
          <span className="metric-label" style={{ color: activeIncidents.length > 0 ? "var(--red)" : undefined }}>
            Active Hazards &amp; Incidents
          </span>
          <div
            className="metric-value"
            style={{ color: activeIncidents.length > 0 ? "var(--red)" : "var(--green)" }}
          >
            {activeIncidents.length > 0 ? `${activeIncidents.length} Open` : "0 Hazards"}
          </div>
          <div className="metric-sub" style={{ color: activeIncidents.length > 0 ? "var(--red)" : undefined }}>
            {activeIncidents.length > 0
              ? "Action required on site"
              : "All clear across parcels"}
          </div>
        </div>
      </div>

      {/* ── 3. ACTIVE INCIDENTS ATTENTION BANNER (IF ANY) ── */}
      {activeIncidents.length > 0 && (
        <section
          className="compact-card"
          style={{
            padding: 20,
            border: "1px solid var(--red-light)",
            background: "var(--red-light)",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--red)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icons.AlertTriangle size={18} />
              </div>
              <div>
                <strong style={{ fontSize: "15px", color: "var(--red)" }}>
                  {activeIncidents.length} Active Operational Incident{activeIncidents.length > 1 ? "s" : ""} Requiring Attention
                </strong>
                <p className="muted" style={{ fontSize: "12px", margin: 0 }}>
                  High-priority alerts recorded by field officers during inspections
                </p>
              </div>
            </div>
            <Link
              href="/owner/reports"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: "12px", borderRadius: "var(--radius-pill)" }}
            >
              <span>View Incident Register &rarr;</span>
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 6 }}>
            {activeIncidents.slice(0, 4).map((inc) => (
              <div
                key={inc.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--canvas)",
                  border: "1px solid var(--canvas)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: inc.severity === "CRITICAL" || inc.severity === "HIGH" ? "var(--red-light)" : "var(--amber-light)",
                      color: inc.severity === "CRITICAL" || inc.severity === "HIGH" ? "var(--red)" : "var(--amber)",
                      border: inc.severity === "CRITICAL" || inc.severity === "HIGH" ? "1px solid var(--red-light)" : "1px solid var(--amber-light)",
                    }}
                  >
                    {inc.severity || "MEDIUM"}
                  </span>
                  <span className="muted" style={{ fontSize: "11px" }}>
                    {inc.farm?.name || (isAll ? "Estate" : selectedFarm?.name)}
                  </span>
                </div>

                <strong style={{ fontSize: "13px", color: "var(--ink)" }}>{inc.type}</strong>
                <p
                  className="muted"
                  style={{
                    fontSize: "12px",
                    margin: 0,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {inc.description}
                </p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--muted)", marginTop: 2 }}>
                  <span>📍 {inc.plot?.name || "Estate Wide"}</span>
                  <span>👤 {inc.reporter?.name || "Field Officer"}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. MULTI-ESTATE PERFORMANCE MATRIX TABLE (WHEN IN "ALL" VIEW) ── */}
      {isAll && farms.length > 1 && (
        <section className="compact-card" style={{ padding: 22, gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--green)" }}>
                <span className="eyebrow-dot" style={{ backgroundColor: "var(--green)" }} />
                <span>PORTFOLIO BREAKDOWN</span>
              </div>
              <h2 className="section-title" style={{ fontSize: "18px", marginTop: 4 }}>
                Estates Performance Matrix
              </h2>
              <p className="muted" style={{ fontSize: "13px", margin: "2px 0 0" }}>
                Comparative operational status, land allocation, and live daily completion across all your farms.
              </p>
            </div>

            {farms.length > 4 && (
              <div style={{ width: 220 }}>
                <input
                  type="text"
                  placeholder="Filter estates..."
                  value={farmSearch}
                  onChange={(e) => setFarmSearch(e.target.value)}
                  className="input-field"
                  style={{ fontSize: "12px", padding: "6px 10px" }}
                />
              </div>
            )}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", fontSize: "13px" }}>
              <thead>
                <tr>
                  <th>Estate Name &amp; Location</th>
                  <th>Acreage (Cultivable / Total)</th>
                  <th>Demarcated Parcels</th>
                  <th>Active Crops</th>
                  <th>Today&apos;s Field Work</th>
                  <th>Muster On-Site</th>
                  <th>Hazards</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {estateMatrix
                  .filter(
                    (row) =>
                      row.farm.name.toLowerCase().includes(farmSearch.toLowerCase()) ||
                      row.farm.location.toLowerCase().includes(farmSearch.toLowerCase())
                  )
                  .map((row) => (
                    <tr key={row.farm.id}>
                      <td>
                        <strong style={{ color: "var(--ink)", display: "block" }}>{row.farm.name}</strong>
                        <span className="muted" style={{ fontSize: "11px" }}>{row.farm.location}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{Number(row.farm.cultivableArea).toFixed(1)} Ac</span>
                        <span className="muted" style={{ fontSize: "11px", marginLeft: 4 }}>
                          / {Number(row.farm.totalArea).toFixed(1)} Ac
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{row.farm.plots.length}</span>
                        <span className="muted" style={{ fontSize: "11px", marginLeft: 4 }}>plots</span>
                      </td>
                      <td>
                        {row.activeCrops.length > 0 ? (
                          <span style={{ fontSize: "12px", color: "var(--green)" }}>
                            {row.activeCrops.join(", ")}
                          </span>
                        ) : (
                          <span className="muted" style={{ fontSize: "12px" }}>No active cycles</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
                          <div style={{ flex: 1, height: 6, background: "var(--stone)", borderRadius: 3, overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${row.progressPercent}%`,
                                height: "100%",
                                background: "var(--green)",
                                borderRadius: 3,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink)" }}>
                            {row.progressPercent}%
                          </span>
                        </div>
                        <span className="muted" style={{ fontSize: "10px" }}>
                          {row.doneCount} of {row.tasksCount} done
                        </span>
                      </td>
                      <td>
                        {row.musterCount > 0 ? (
                          <span style={{ fontWeight: 600, color: "var(--green)" }}>
                            {row.musterCount} Workers
                          </span>
                        ) : (
                          <span className="muted" style={{ fontSize: "12px" }}>None logged</span>
                        )}
                      </td>
                      <td>
                        {row.openIncidentsCount > 0 ? (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "var(--red)",
                              background: "var(--red-light)",
                              padding: "2px 6px",
                              borderRadius: 4,
                            }}
                          >
                            {row.openIncidentsCount} Open
                          </span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--green)" }}>✓ Clear</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedFarmId(row.farm.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: "11px", padding: "4px 8px" }}
                        >
                          Open Cockpit &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── 5. TODAY'S OPERATIONS PROGRESS & PENDING ACTIONS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        {/* Operations Progress */}
        <section className="compact-card" style={{ padding: 22, gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="mono-label" style={{ color: "var(--green-dark)" }}>DAILY FIELD PROGRESS</span>
              <h3 style={{ fontSize: "17px", margin: "4px 0 0" }}>Today&apos;s Scheduled Operations</h3>
            </div>
            <Link href="/reports/daily" className="btn btn-secondary btn-sm" style={{ borderRadius: "var(--radius-pill)" }}>
              <Icons.FileText size={13} />
              <span>Full Daily Log</span>
            </Link>
          </div>

          <div style={{ width: "100%", height: 8, backgroundColor: "var(--stone)", borderRadius: "var(--radius-pill)", overflow: "hidden" }}>
            <div style={{ width: `${progressPercent}%`, height: "100%", backgroundColor: "var(--green)", transition: "width 0.4s ease" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {pendingTasks.slice(0, 4).map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "var(--stone)",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "13px",
                }}
              >
                <div>
                  <strong style={{ color: "var(--ink)", display: "block" }}>{t.title}</strong>
                  <span className="muted" style={{ fontSize: "11px" }}>
                    {t.farm ? `${t.farm.name} • ` : ""}
                    {t.plot ? t.plot.name : "Estate Wide"} • Priority: {t.priority}
                  </span>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <div className="muted" style={{ fontSize: "13px", textAlign: "center", padding: "12px 0" }}>
                ✓ All scheduled operations for today have been completed.
              </div>
            )}
            {pendingTasks.length > 4 && (
              <div style={{ textAlign: "center", paddingTop: 4 }}>
                <Link href="/owner/calendar" className="muted hover-ink" style={{ fontSize: "12px" }}>
                  + {pendingTasks.length - 4} more operations scheduled &rarr;
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Financials Quick Breakdown */}
        <section className="compact-card" style={{ padding: 22, gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="mono-label" style={{ color: "var(--green-dark)" }}>EXPENSE ALLOCATION</span>
              <h3 style={{ fontSize: "17px", margin: "4px 0 0" }}>Operating Spend by Category</h3>
            </div>
            <Link href="/owner/financials" className="btn btn-secondary btn-sm" style={{ borderRadius: "var(--radius-pill)" }}>
              <Icons.Coins size={13} />
              <span>View Ledger</span>
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {expenses.categorySums.map((cat: any) => (
              <div
                key={cat.category}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--line)",
                  fontSize: "13px",
                }}
              >
                <span style={{ textTransform: "capitalize", color: "var(--ink)" }}>
                  {cat.category.toLowerCase().replaceAll("_", " ")}
                </span>
                <strong style={{ color: "var(--ink)" }}>₹{cat.total.toLocaleString()}</strong>
              </div>
            ))}
            {expenses.categorySums.length === 0 && (
              <div className="muted" style={{ fontSize: "13px", textAlign: "center", padding: "12px 0" }}>
                No expenses logged this month yet.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── 6. LIVE FIELD VISUAL REASSURANCE STREAM ── */}
      <section className="compact-card" style={{ padding: 22, gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--green)" }}>
              <span className="eyebrow-dot" style={{ backgroundColor: "var(--green)" }} />
              <span>VISUAL REASSURANCE STREAM</span>
            </div>
            <h3 className="section-title" style={{ fontSize: "18px", marginTop: 4 }}>
              Recent Field Photos &amp; Crop Snaps
            </h3>
          </div>
          <span className="muted" style={{ fontSize: "12px" }}>
            Live photos captured by your on-site farm officer during morning rounds
          </span>
        </div>

        {recentPhotos.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {recentPhotos.slice(0, 6).map((p, idx) => (
              <div
                key={idx}
                style={{
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  border: "1px solid var(--stone)",
                  background: "var(--stone)",
                  aspectRatio: "4/3",
                  position: "relative",
                }}
              >
                <img
                  src={p.url}
                  alt={p.plotName || "Crop photo"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(0,0,0,0.65)",
                    color: "#fff",
                    padding: "4px 8px",
                    fontSize: "11px",
                  }}
                >
                  {p.plotName} • {p.stage || "Active"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ textAlign: "center", padding: "28px 0", fontSize: "13px" }}>
            No monitoring photos uploaded yet for this estate.
          </div>
        )}
      </section>

      {/* ── 7. QUICK NAVIGATION CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <Link
          href="/owner/plots"
          className="compact-card hover-glow"
          style={{ padding: 18, textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.Plot size={18} style={{ color: "var(--green)" }} />
            <strong style={{ color: "var(--ink)", fontSize: "14px" }}>Plots &amp; Orchards</strong>
          </div>
          <span className="muted" style={{ fontSize: "12px" }}>
            {scopeTotalPlots} active parcels managed
          </span>
        </Link>

        <Link
          href="/owner/harvest"
          className="compact-card hover-glow"
          style={{ padding: 18, textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.Truck size={18} style={{ color: "var(--green)" }} />
            <strong style={{ color: "var(--ink)", fontSize: "14px" }}>Commercial Harvest</strong>
          </div>
          <span className="muted" style={{ fontSize: "12px" }}>
            {harvests.length} picking batches recorded
          </span>
        </Link>

        <Link
          href="/owner/inventory"
          className="compact-card hover-glow"
          style={{ padding: 18, textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.Package size={18} style={{ color: "var(--green)" }} />
            <strong style={{ color: "var(--ink)", fontSize: "14px" }}>Tool Shed &amp; Stock</strong>
          </div>
          <span className="muted" style={{ fontSize: "12px" }}>
            Monitor input inventory balances
          </span>
        </Link>

        <Link
          href="/admin/attendance"
          className="compact-card hover-glow"
          style={{ padding: 18, textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.Users size={18} style={{ color: "var(--green)" }} />
            <strong style={{ color: "var(--ink)", fontSize: "14px" }}>Workforce Muster</strong>
          </div>
          <span className="muted" style={{ fontSize: "12px" }}>
            Manager presence &amp; labour hours
          </span>
        </Link>
      </div>
    </div>
  );
}
