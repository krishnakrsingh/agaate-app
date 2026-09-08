"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";

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

export function OwnerCockpit({ initialFarms }: { initialFarms: Farm[] }) {
  const [farms] = useState<Farm[]>(initialFarms);
  const [selectedFarmId, setSelectedFarmId] = useState<string>(initialFarms[0]?.id || "");
  const [tasks, setTasks] = useState<any[]>([]);
  const [harvests, setHarvests] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<{ totalBurn: number; categorySums: any[] }>({
    totalBurn: 0,
    categorySums: [],
  });
  const [musters, setMusters] = useState<any[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];

  useEffect(() => {
    if (!selectedFarmId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/tasks?farmId=${selectedFarmId}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/harvest?farmId=${selectedFarmId}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/expenses?farmId=${selectedFarmId}`).then((r) => (r.ok ? r.json() : { totalBurn: 0, categorySums: [] })),
      fetch(`/api/crew?farmId=${selectedFarmId}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/reports/daily?farmId=${selectedFarmId}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([tData, hData, eData, mData, rData]) => {
        setTasks(tData || []);
        setHarvests(hData || []);
        setExpenses(eData || { totalBurn: 0, categorySums: [] });
        setMusters(mData || []);
        if (rData?.monitoringPhotos) {
          setRecentPhotos(rData.monitoringPhotos);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedFarmId]);

  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const pendingTasks = tasks.filter((t) => t.status !== "COMPLETED");
  const progressPercent = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const totalHarvestKg = harvests.reduce((acc, h) => acc + Number(h.quantity || 0), 0);
  const totalRevenue = harvests.reduce((acc, h) => acc + Number(h.totalAmount || 0), 0);

  const todayMuster = musters[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* ── 1. OWNER COMMAND HEADER ── */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>ESTATE OWNER COCKPIT &bull; CLIENT COMMAND</span>
          </div>
          <h1 className="page-title">{selectedFarm?.name || "My Farmland"}</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Live operational oversight: field workforce, crop progress, harvest yield, and monthly burn rate.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {farms.length > 1 && (
            <div style={{ minWidth: 200 }}>
              <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>
                Switch Estate
              </label>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="input-field"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.location})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Link
            href="/owner/reports/brief"
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-end", height: 38 }}
          >
            <Icons.FileText size={14} />
            <span>Executive Brief &amp; WhatsApp</span>
          </Link>
        </div>
      </div>

      {/* ── 2. EXECUTIVE TELEMETRY ROW ── */}
      <div className="metric-summary-row">
        <div className="metric-summary-item">
          <span className="metric-label">Today&apos;s Field Muster</span>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            {todayMuster ? `${todayMuster.totalLabourers} Workers` : "Logged On-Site"}
          </div>
          <div className="metric-sub">
            {todayMuster?.contractorName
              ? `Contractor: ${todayMuster.contractorName}`
              : "Field operations in progress"}
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Operations Pulse</span>
          <div className="metric-value">{progressPercent}%</div>
          <div className="metric-sub">
            {completedTasks} of {tasks.length} tasks finished today
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Harvested Output</span>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            {totalHarvestKg > 0 ? `${totalHarvestKg.toLocaleString()} kg` : "0 kg"}
          </div>
          <div className="metric-sub">
            {totalRevenue > 0 ? `Est. Value: ₹${totalRevenue.toLocaleString()}` : "Season in progress"}
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Operating Spend</span>
          <div className="metric-value" style={{ color: "var(--ink)" }}>
            ₹{expenses.totalBurn ? expenses.totalBurn.toLocaleString() : "0"}
          </div>
          <div className="metric-sub">Month-to-Date farm burn</div>
        </div>
      </div>

      {/* ── 3. TODAY'S OPERATIONS PROGRESS & PENDING ACTIONS ── */}
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
            {pendingTasks.slice(0, 3).map((t) => (
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
                    {t.plot ? t.plot.name : "Estate Wide"} &bull; Priority: {t.priority}
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

      {/* ── 4. LIVE FIELD VISUAL REASSURANCE STREAM ── */}
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
            Live photos captured by your on-site manager during inspections
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
                  border: "1px solid var(--line)",
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
                  {p.plotName} &bull; {p.stage || "Active"}
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

      {/* ── 5. QUICK NAVIGATION CARDS ── */}
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
            {selectedFarm?.plots?.length || 0} active parcels managed
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
