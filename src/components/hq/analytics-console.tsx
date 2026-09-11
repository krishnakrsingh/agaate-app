"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";
import { downloadCsv } from "@/lib/export";

type ClientOption = { id: string; name: string; code: string | null };
type FarmOption = { id: string; name: string; clientId: string | null };

type CycleRow = {
  id: string;
  cropName: string;
  startDate: string;
  status: string;
  plotId: string;
  plotName: string;
  farmId: string;
  farmName: string;
};

type Overview = {
  scope: { clientId: string | null; farmId: string | null; from: string; to: string; label: string };
  cropHistory: {
    total: number;
    truncated: boolean;
    byStatus: { status: string; count: number }[];
    cycles: CycleRow[];
  };
  harvest: {
    totalKg: number;
    totalRevenue: number;
    batches: number;
    byFarm: { farmId: string; farmName: string; kg: number; revenue: number; batches: number }[];
    byCrop: { cropCycleId: string; cropName: string; kg: number; revenue: number; batches: number }[];
    byGrade: { grade: string; kg: number; batches: number }[];
    byDate: { date: string; kg: number }[];
  };
  officers: {
    officerId: string;
    officerName: string;
    tasksAssigned: number;
    tasksCompleted: number;
    completionRate: number;
    harvestsLogged: number;
    harvestKg: number;
    attendanceDays: number;
    attendanceRate: number;
  }[];
  land: {
    farmCount: number;
    totalAcres: number;
    cultivableAcres: number;
    mappedPlotAcres: number;
    plotCount: number;
    activeCycles: number;
    mappingRate: number;
  };
  incidents: {
    total: number;
    ratePer100Cycles: number;
    byStatus: { status: string; count: number }[];
    byLevel: { level: string; count: number }[];
    byType: { type: string; count: number }[];
    byFarm: { farmId: string; farmName: string; count: number }[];
    monitoringByStatus: { status: string; count: number }[];
  };
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function Widget({
  title,
  sub,
  drillHref,
  drillLabel,
  onExport,
  exportDisabled,
  children,
}: {
  title: string;
  sub: string;
  drillHref?: string;
  drillLabel?: string;
  onExport: () => void;
  exportDisabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="compact-card" style={{ padding: 22, gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="mono-label" style={{ color: "var(--green-dark)" }}>{sub}</span>
          <h2 className="section-title" style={{ fontSize: "17px", margin: "2px 0 0" }}>{title}</h2>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {drillHref && (
            <Link href={drillHref} className="btn btn-sm btn-ghost" style={{ fontSize: 12 }}>
              {drillLabel || "Open details"}
            </Link>
          )}
          <button type="button" className="btn btn-sm btn-secondary" onClick={onExport} disabled={exportDisabled}>
            Export CSV
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

function BarRow({ label, display, value, max }: { label: string; display: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 220px) 1fr auto", gap: 10, alignItems: "center", fontSize: 13 }}>
      <span style={{ fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ height: 10, borderRadius: 5, background: "var(--stone)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 5, background: "var(--green)" }} />
      </div>
      <span className="font-mono" style={{ fontSize: 12 }}>{display}</span>
    </div>
  );
}

function TrendChart({ points }: { points: { date: string; kg: number }[] }) {
  const W = 640;
  const H = 140;
  const PAD = 8;
  const max = Math.max(...points.map((p) => p.kg), 0);
  if (points.length === 0 || max <= 0) {
    return <div className="muted" style={{ fontSize: 12, padding: "12px 0" }}>No harvest volume in this range.</div>;
  }
  const step = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: PAD + i * step,
    y: H - PAD - (p.kg / max) * (H - PAD * 2),
  }));
  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Harvest volume trend">
        <polyline points={line} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) =>
          i % Math.ceil(coords.length / 24) === 0 ? <circle key={i} cx={c.x} cy={c.y} r="3" fill="var(--green-dark)" /> : null
        )}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }} className="muted">
        <span>{formatDate(points[0].date)}</span>
        <span>Peak {max.toLocaleString()} kg</span>
        <span>{formatDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>{text}</div>;
}

export function AnalyticsConsole({ clients, farms }: { clients: ClientOption[]; farms: FarmOption[] }) {
  const toast = useToast();
  const [clientId, setClientId] = useState("");
  const [farmId, setFarmId] = useState("ALL");
  const [from, setFrom] = useState(() => daysAgoIso(90));
  const [to, setTo] = useState(() => todayIso());
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formNote, setFormNote] = useState<string | null>(null);

  const farmOptions = useMemo(
    () => (clientId ? farms.filter((f) => f.clientId === clientId) : farms),
    [farms, clientId]
  );

  const farmsDrill = farmId !== "ALL" ? `/farms/${farmId}` : clientId ? `/farms?clientId=${encodeURIComponent(clientId)}` : "/farms";
  const tasksDrill = farmId !== "ALL" ? `/tasks?farmId=${encodeURIComponent(farmId)}` : "/tasks";

  async function load() {
    if (!clientId && farmId === "ALL") {
      setFormNote("Select a client or a specific farm first. Platform-wide scans are disabled on this page.");
      return;
    }
    if (!from || !to) {
      setFormNote("A date range is required.");
      return;
    }
    setFormNote(null);
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (farmId !== "ALL") params.set("farmId", farmId);
      else if (clientId) params.set("clientId", clientId);
      params.set("from", from);
      params.set("to", to);
      const res = await fetch(`/api/hq/analytics/overview?${params.toString()}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to load analytics");
      setData(body as Overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const fileSuffix = data ? `${data.scope.label.toLowerCase().replace(/\s+/g, "-")}-${data.scope.from}-${data.scope.to}` : "scope";

  const exportCycles = () => {
    if (!data) return;
    downloadCsv(
      `crop-history-${fileSuffix}`,
      ["Crop", "Plot", "Farm", "Start Date", "Status"],
      data.cropHistory.cycles.map((c) => [c.cropName, c.plotName, c.farmName, c.startDate, c.status])
    );
    toast.success("Crop history exported to CSV");
  };
  const exportHarvest = () => {
    if (!data) return;
    downloadCsv(
      `harvest-totals-${fileSuffix}`,
      ["Farm", "Quantity (kg)", "Revenue (INR)", "Batches"],
      data.harvest.byFarm.map((h) => [h.farmName, h.kg, h.revenue, h.batches])
    );
    toast.success("Harvest totals exported to CSV");
  };
  const exportOfficers = () => {
    if (!data) return;
    downloadCsv(
      `officer-productivity-${fileSuffix}`,
      ["Officer", "Tasks Assigned", "Tasks Completed", "Completion Rate (%)", "Harvests Logged", "Harvest (kg)", "Attendance Days", "Attendance Rate (%)"],
      data.officers.map((o) => [o.officerName, o.tasksAssigned, o.tasksCompleted, o.completionRate, o.harvestsLogged, o.harvestKg, o.attendanceDays, o.attendanceRate])
    );
    toast.success("Officer productivity exported to CSV");
  };
  const exportLand = () => {
    if (!data) return;
    const l = data.land;
    downloadCsv(
      `land-utilization-${fileSuffix}`,
      ["Metric", "Value"],
      [
        ["Scope", data.scope.label],
        ["Farms in scope", l.farmCount],
        ["Total acres", l.totalAcres],
        ["Cultivable acres", l.cultivableAcres],
        ["Mapped plot acres", l.mappedPlotAcres],
        ["Mapping rate (%)", l.mappingRate],
        ["Plots", l.plotCount],
        ["Active crop cycles", l.activeCycles],
      ]
    );
    toast.success("Land utilization exported to CSV");
  };
  const exportIncidents = () => {
    if (!data) return;
    downloadCsv(
      `incident-rates-${fileSuffix}`,
      ["Type", "Count"],
      data.incidents.byType.map((t) => [t.type, t.count])
    );
    toast.success("Incident rates exported to CSV");
  };

  const maxFarmKg = Math.max(...(data?.harvest.byFarm.map((h) => h.kg) || [0]));
  const maxCropKg = Math.max(...(data?.harvest.byCrop.map((h) => h.kg) || [0]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Filters */}
      <div className="card" style={{ padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <div>
          <label className="mono-label" style={{ display: "block", marginBottom: 4 }} htmlFor="hq-client">Client (required unless farm set)</label>
          <select
            id="hq-client"
            className="input-field"
            style={{ minWidth: 220 }}
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setFarmId("ALL");
            }}
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.code ? ` (${c.code})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mono-label" style={{ display: "block", marginBottom: 4 }} htmlFor="hq-farm">Farm</label>
          <select id="hq-farm" className="input-field" style={{ minWidth: 220 }} value={farmId} onChange={(e) => setFarmId(e.target.value)}>
            <option value="ALL">{clientId ? `All farms of client (${farmOptions.length})` : "All (pick a client first)"}</option>
            {(clientId ? farmOptions : []).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
            {!clientId && farmId !== "ALL" && farms.filter((f) => f.id === farmId).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mono-label" style={{ display: "block", marginBottom: 4 }} htmlFor="hq-from">From</label>
          <input id="hq-from" type="date" className="input-field" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mono-label" style={{ display: "block", marginBottom: 4 }} htmlFor="hq-to">To</label>
          <input id="hq-to" type="date" className="input-field" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="button" className="btn btn-green" onClick={() => void load()} disabled={loading}>
          {loading ? "Loading" : "Apply"}
        </button>
      </div>
      {formNote && (
        <div className="card" style={{ padding: "12px 18px", fontSize: 13, color: "var(--amber)" }}>{formNote}</div>
      )}

      {loading && (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          <Icons.Spinner size={24} className="animate-spin" style={{ margin: "0 auto 8px", color: "var(--green)" }} />
          Aggregating farm history and yield data...
        </div>
      )}

      {error && !loading && (
        <div className="card" style={{ padding: 32, textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Could not load analytics</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{error}</div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()}>Retry</button>
        </div>
      )}

      {!loading && !error && !data && (
        <EmptyNote text="Select a client or farm, pick a date range, then Apply. Results are aggregate-only and capped at the top 50 rows per list." />
      )}

      {data && !loading && !error && (
        <>
          {/* KPI row */}
          <div className="metric-summary-row">
            <Link href={farmsDrill} className="metric-summary-item" style={{ textDecoration: "none" }}>
              <span className="metric-label">Harvest in range</span>
              <div className="metric-value font-mono" style={{ color: "var(--green)" }}>{data.harvest.totalKg.toLocaleString()} kg</div>
              <div className="metric-sub">{data.harvest.batches} batches logged</div>
            </Link>
            <Link href={farmsDrill} className="metric-summary-item" style={{ textDecoration: "none" }}>
              <span className="metric-label">Revenue in range</span>
              <div className="metric-value font-mono">Rs {data.harvest.totalRevenue.toLocaleString("en-IN")}</div>
              <div className="metric-sub">{data.scope.label}</div>
            </Link>
            <Link href={tasksDrill} className="metric-summary-item" style={{ textDecoration: "none" }}>
              <span className="metric-label">Crop cycles started</span>
              <div className="metric-value font-mono">{data.cropHistory.total}</div>
              <div className="metric-sub">{data.land.activeCycles} currently active</div>
            </Link>
            <Link href={farmsDrill} className="metric-summary-item" style={{ textDecoration: "none" }}>
              <span className="metric-label">Land mapped</span>
              <div className="metric-value font-mono">{data.land.mappingRate}%</div>
              <div className="metric-sub">{data.land.mappedPlotAcres.toLocaleString()} of {data.land.cultivableAcres.toLocaleString()} cultivable acres</div>
            </Link>
            <Link href="/operations" className="metric-summary-item" style={{ textDecoration: "none" }}>
              <span className="metric-label">Incidents in range</span>
              <div className="metric-value font-mono">{data.incidents.total}</div>
              <div className="metric-sub">{data.incidents.ratePer100Cycles} per 100 cycles</div>
            </Link>
          </div>

          {/* Crop history */}
          <Widget
            title={`Crop history per plot (${data.cropHistory.total} cycles)`}
            sub="FARMING HISTORY"
            drillHref={farmsDrill}
            drillLabel="Open farms"
            onExport={exportCycles}
            exportDisabled={data.cropHistory.cycles.length === 0}
          >
            {data.cropHistory.byStatus.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {data.cropHistory.byStatus.map((s) => (
                  <span key={s.status} className="badge badge-muted" style={{ fontSize: 11 }}>
                    {s.status}: {s.count}
                  </span>
                ))}
              </div>
            )}
            {data.cropHistory.cycles.length === 0 ? (
              <EmptyNote text="No crop cycles started in this range." />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Crop</th>
                      <th>Plot</th>
                      <th>Farm</th>
                      <th>Start</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cropHistory.cycles.map((c) => (
                      <tr key={c.id}>
                        <td><strong>{c.cropName}</strong></td>
                        <td>{c.plotName}</td>
                        <td>{c.farmName}</td>
                        <td>{formatDate(c.startDate)}</td>
                        <td><span className="badge badge-muted" style={{ fontSize: 11 }}>{c.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.cropHistory.truncated && (
                  <div className="muted" style={{ fontSize: 12, paddingTop: 8 }}>Showing latest 50 of {data.cropHistory.total}. Narrow the date range for full detail.</div>
                )}
              </div>
            )}
          </Widget>

          {/* Harvest totals */}
          <Widget
            title="Harvest totals"
            sub="YIELD INTELLIGENCE"
            drillHref={farmsDrill}
            drillLabel="Open farms"
            onExport={exportHarvest}
            exportDisabled={data.harvest.byFarm.length === 0}
          >
            {data.harvest.byFarm.length === 0 ? (
              <EmptyNote text="No harvests logged in this range." />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span className="mono-label">KG PER FARM (TOP 50)</span>
                  {data.harvest.byFarm.slice(0, 10).map((h) => (
                    <BarRow key={h.farmId} label={h.farmName} display={`${h.kg.toLocaleString()} kg`} value={h.kg} max={maxFarmKg} />
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span className="mono-label">DAILY VOLUME TREND</span>
                  <TrendChart points={data.harvest.byDate} />
                  <span className="mono-label" style={{ marginTop: 8 }}>KG PER CROP (TOP 50)</span>
                  {data.harvest.byCrop.slice(0, 8).map((h) => (
                    <BarRow key={h.cropCycleId} label={h.cropName} display={`${h.kg.toLocaleString()} kg`} value={h.kg} max={maxCropKg} />
                  ))}
                  {data.harvest.byGrade.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                      {data.harvest.byGrade.map((g) => (
                        <span key={g.grade} className="badge badge-green" style={{ fontSize: 11 }}>
                          {g.grade}: {g.kg.toLocaleString()} kg
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Widget>

          {/* Officer productivity */}
          <Widget
            title={`Officer productivity (${data.officers.length} officers)`}
            sub="WORKFORCE"
            drillHref="/people"
            drillLabel="Open people"
            onExport={exportOfficers}
            exportDisabled={data.officers.length === 0}
          >
            {data.officers.length === 0 ? (
              <EmptyNote text="No officer activity in this range." />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Officer</th>
                      <th>Tasks done</th>
                      <th>Completion</th>
                      <th>Harvests</th>
                      <th>Harvest kg</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.officers.map((o) => (
                      <tr key={o.officerId}>
                        <td><strong>{o.officerName}</strong></td>
                        <td>{o.tasksCompleted} of {o.tasksAssigned}</td>
                        <td>{o.completionRate}%</td>
                        <td>{o.harvestsLogged}</td>
                        <td>{o.harvestKg.toLocaleString()} kg</td>
                        <td>
                          <Link href="/attendance" style={{ color: "var(--green-dark)", fontWeight: 600 }}>
                            {o.attendanceRate}% ({o.attendanceDays}d)
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Widget>

          {/* Land utilization */}
          <Widget
            title="Land utilization"
            sub="ACREAGE"
            drillHref={farmsDrill}
            drillLabel="Open farms"
            onExport={exportLand}
            exportDisabled={false}
          >
            <div className="metric-summary-row">
              <div className="metric-summary-item">
                <span className="metric-label">Cultivable area</span>
                <div className="metric-value font-mono">{data.land.cultivableAcres.toLocaleString()} ac</div>
                <div className="metric-sub">across {data.land.farmCount} farms</div>
              </div>
              <div className="metric-summary-item">
                <span className="metric-label">Mapped plots</span>
                <div className="metric-value font-mono">{data.land.mappedPlotAcres.toLocaleString()} ac</div>
                <div className="metric-sub">{data.land.plotCount} plots ({data.land.mappingRate}% of cultivable)</div>
              </div>
              <div className="metric-summary-item">
                <span className="metric-label">Active cycles</span>
                <div className="metric-value font-mono">{data.land.activeCycles}</div>
                <div className="metric-sub">crops in ground now</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <BarRow label="Cultivable" display={`${data.land.cultivableAcres.toLocaleString()} ac`} value={data.land.cultivableAcres} max={Math.max(data.land.cultivableAcres, data.land.mappedPlotAcres, data.land.totalAcres)} />
              <BarRow label="Mapped plots" display={`${data.land.mappedPlotAcres.toLocaleString()} ac`} value={data.land.mappedPlotAcres} max={Math.max(data.land.cultivableAcres, data.land.mappedPlotAcres, data.land.totalAcres)} />
              <BarRow label="Total holding" display={`${data.land.totalAcres.toLocaleString()} ac`} value={data.land.totalAcres} max={Math.max(data.land.cultivableAcres, data.land.mappedPlotAcres, data.land.totalAcres)} />
            </div>
          </Widget>

          {/* Incident rates */}
          <Widget
            title="Incident rates"
            sub="CROP HEALTH"
            drillHref="/operations"
            drillLabel="Open inbox"
            onExport={exportIncidents}
            exportDisabled={data.incidents.byType.length === 0}
          >
            {data.incidents.total === 0 ? (
              <EmptyNote text="No incidents reported in this range." />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
                <div>
                  <span className="mono-label">BY STATUS</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {data.incidents.byStatus.map((s) => (
                      <span key={s.status} className="badge badge-muted" style={{ fontSize: 11 }}>{s.status}: {s.count}</span>
                    ))}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <span className="mono-label">BY LEVEL</span>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {data.incidents.byLevel.map((s) => (
                        <span key={s.level} className="badge badge-muted" style={{ fontSize: 11 }}>{s.level}: {s.count}</span>
                      ))}
                    </div>
                  </div>
                  {data.incidents.monitoringByStatus.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <span className="mono-label">CROP CHECKS</span>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                        {data.incidents.monitoringByStatus.map((s) => (
                          <span key={s.status} className="badge badge-muted" style={{ fontSize: 11 }}>{s.status}: {s.count}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span className="mono-label">BY FARM (TOP 50)</span>
                  {data.incidents.byFarm.slice(0, 8).map((f) => (
                    <BarRow key={f.farmId} label={f.farmName} display={`${f.count}`} value={f.count} max={Math.max(...data.incidents.byFarm.map((x) => x.count), 0)} />
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span className="mono-label">BY TYPE (TOP 50)</span>
                  {data.incidents.byType.slice(0, 8).map((t) => (
                    <BarRow key={t.type} label={t.type} display={`${t.count}`} value={t.count} max={Math.max(...data.incidents.byType.map((x) => x.count), 0)} />
                  ))}
                </div>
              </div>
            )}
          </Widget>
        </>
      )}

    </div>
  );
}
