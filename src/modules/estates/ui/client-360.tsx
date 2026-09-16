"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { StatusBadge } from "@/components/ui/badge";

interface Pin {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
}

interface FarmItem {
  id: string;
  name: string;
  status: string;
  setupStage: string;
  totalArea: number;
  cultivableArea: number;
  plotCount: number;
  hasBoundary: boolean;
  updatedAt: string;
}

interface PlotItem {
  id: string;
  name: string;
  area: number;
  status: string;
  farmId: string;
  farmName: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  farms: Array<{ id: string; name: string; canManage: boolean }>;
}

interface Bundle {
  client: {
    id: string;
    code: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    secondaryContact: string | null;
    entityType: string | null;
    panNumber: string | null;
    gstin: string | null;
    billingAddress: string | null;
    address: string | null;
    state: string | null;
    district: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  metrics: { farmCount: number; plotCount: number; officerCount: number; totalAcreage: number };
  pins: { items: Pin[]; hasMore: boolean };
  farms: { items: FarmItem[]; total: number; limit: number; offset: number };
  plots: { items: PlotItem[]; total: number; limit: number; offset: number };
  team: TeamMember[];
  teamCapped: boolean;
  filesCapped: boolean;
  history: {
    harvests: Array<{
      id: string;
      date: string;
      quantity: number;
      unit: string;
      grade: string;
      crop: string;
      farmId: string;
      farmName: string;
      plotName: string;
    }>;
    incidents: Array<{
      id: string;
      type: string;
      severity: string | null;
      status: string;
      createdAt: string;
      farmId: string;
      farmName: string;
      plotName: string | null;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      category: string;
      status: string;
      dueDate: string;
      farmId: string;
      farmName: string;
    }>;
    cycles: Array<{
      id: string;
      cropName: string;
      status: string;
      startDate: string;
      plotId: string;
      plotName: string;
      farmId: string;
      farmName: string;
    }>;
  };
  files: Array<{
    id: string;
    storageKey: string;
    kind: string;
    mimeType: string;
    sizeBytes: number;
    farmId: string | null;
    createdAt: string;
  }>;
  notes: Array<{
    id: string;
    action: string;
    remarks: string | null;
    authorName: string;
    incidentId: string;
    incidentType: string;
    farmId: string;
    farmName: string;
    createdAt: string;
  }>;
}

type Tab = "farms" | "plots" | "team" | "history" | "files";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "farms", label: "Farms Portfolio" },
  { id: "plots", label: "Land Parcels & Plots" },
  { id: "team", label: "Team & Field Workforce" },
  { id: "history", label: "Operational History" },
  { id: "files", label: "Documents & Evidence" },
];

function Field({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "var(--canvas-floor)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--hairline)",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: "var(--muted)",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", wordBreak: "break-word" }}>
        {value || <span style={{ color: "var(--muted)" }}>—</span>}
      </div>
    </div>
  );
}

function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>{title}</div>
      {hint && <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

function MiniMap({ pins, hasMore }: { pins: Pin[]; hasMore: boolean }) {
  if (pins.length === 0) {
    return <Empty title="No farm locations mapped yet" hint="Farm pins appear here once boundary coordinates are registered." />;
  }
  const lats = pins.map((p) => p.latitude);
  const lngs = pins.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const W = 100;
  const H = 50;
  const PAD = 10;
  const x = (lng: number) =>
    maxLng === minLng ? W / 2 : PAD + ((lng - minLng) / (maxLng - minLng)) * (W - PAD * 2);
  const y = (lat: number) =>
    maxLat === minLat ? H / 2 : PAD + ((maxLat - lat) / (maxLat - minLat)) * (H - PAD * 2);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 220,
          background: "var(--canvas-floor)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--hairline)",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "100%", display: "block" }}
          role="img"
          aria-label="Map of client farms"
        >
          {/* Subtle grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="var(--hairline)" strokeDasharray="2 2" strokeWidth="0.5" />
          <line x1="50" y1="0" x2="50" y2="50" stroke="var(--hairline)" strokeDasharray="2 2" strokeWidth="0.5" />

          {pins.map((p) => {
            const cx = x(p.longitude);
            const cy = y(p.latitude);
            const isActive = p.status === "ACTIVE";
            return (
              <g key={p.id} style={{ cursor: "pointer" }}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={isActive ? "rgba(34, 197, 94, 0.2)" : "rgba(245, 158, 11, 0.2)"}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={2.2}
                  fill={isActive ? "#15803d" : "#d97706"}
                  stroke="#ffffff"
                  strokeWidth={0.6}
                >
                  <title>{p.name} — Click to inspect farm</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--muted)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icons.MapPin size={13} />
          <span>
            {pins.length} farm location{pins.length !== 1 ? "s" : ""} plotted
            {hasMore ? " (showing first 200)" : ""}
          </span>
        </span>
        <Link href="/spatial" style={{ color: "var(--ink)", fontWeight: 500, fontSize: 12 }}>
          Open Spatial Console &rarr;
        </Link>
      </div>
    </div>
  );
}

export function Client360({ clientId }: { clientId: string }) {
  const [tab, setTab] = useState<Tab>("farms");
  const [data, setData] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farmPage, setFarmPage] = useState(1);
  const [plotPage, setPlotPage] = useState(1);
  const [teamMsg, setTeamMsg] = useState<string | null>(null);
  const [teamBusy, setTeamBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      farmOffset: String((farmPage - 1) * 10),
      plotOffset: String((plotPage - 1) * 10),
    });
    fetch(`/api/hq/clients/${clientId}?${params.toString()}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error("This client no longer exists.");
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Failed to load client.");
        }
        return res.json();
      })
      .then((d: Bundle) => setData(d))
      .catch((e) => {
        setData(null);
        setError(e instanceof Error ? e.message : "Failed to load client.");
      })
      .finally(() => setLoading(false));
  }, [clientId, farmPage, plotPage]);

  useEffect(() => {
    load();
  }, [load]);

  const teamAction = async (userId: string, body: Record<string, unknown>, label: string) => {
    setTeamBusy(userId);
    setTeamMsg(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || `${label} failed.`);
      setTeamMsg(`${label} succeeded.`);
      load();
    } catch (e) {
      setTeamMsg(e instanceof Error ? e.message : `${label} failed.`);
    } finally {
      setTeamBusy(null);
    }
  };

  const toggleActive = (m: TeamMember) =>
    teamAction(m.id, { active: !m.active }, m.active ? "Deactivation" : "Reactivation");

  const resetPassword = (m: TeamMember) => {
    const next = prompt(`Set a new password for ${m.name} (min 12 characters):`);
    if (!next) return;
    if (next.length < 12) {
      setTeamMsg("Password must be at least 12 characters.");
      return;
    }
    teamAction(m.id, { password: next }, "Credential reset");
  };

  if (loading && !data) {
    return (
      <div style={{ padding: 64, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
        Loading Client 360 profile...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-lg)",
          padding: 48,
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 16, marginBottom: 4 }}>
          {error || "Client profile not found."}
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>
          The client account may have been removed or you lack permissions to view it.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
            <span>Retry</span>
          </button>
          <Link href="/hq/clients" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            <span>&larr; Back to Client Directory</span>
          </Link>
        </div>
      </div>
    );
  }

  const { client, metrics } = data;
  const admins = data.team.filter((m) => m.role === "FARM_ADMIN");
  const officers = data.team.filter((m) => m.role !== "FARM_ADMIN");
  const farmPages = Math.ceil(data.farms.total / data.farms.limit) || 1;
  const plotPages = Math.ceil(data.plots.total / data.plots.limit) || 1;
  const initials = client.name.trim().charAt(0).toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── 1. Client Profile Hero Header Card ── */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Top Header Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--surface-strong)",
                border: "1px solid var(--hairline)",
                color: "var(--ink)",
                fontSize: 20,
                fontWeight: 700,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--ink)", letterSpacing: "-0.01em" }}>
                  {client.name}
                </h1>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "var(--surface-strong)",
                    border: "1px solid var(--hairline)",
                    color: "var(--ink)",
                  }}
                >
                  {client.code}
                </span>
                <StatusBadge status={client.status} />
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                {client.companyName ? `${client.companyName} &bull; ` : ""}Client ID:{" "}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{client.id}</span>
              </div>
            </div>
          </div>

          <Link
            href={`/hq/onboarding/new?clientId=${client.id}`}
            className="btn btn-primary btn-sm"
            style={{ textDecoration: "none", borderRadius: "var(--radius-md)" }}
            title="Open onboarding wizard prefilled with this client"
          >
            <Icons.Plus size={14} />
            <span>Add Farm Estate</span>
          </Link>
        </div>

        {/* 4-Card Portfolio Metrics Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div style={{ padding: "12px 14px", background: "var(--canvas-floor)", borderRadius: "var(--radius-md)", border: "1px solid var(--hairline)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Farms</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>{metrics.farmCount}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Registered estates</div>
          </div>

          <div style={{ padding: "12px 14px", background: "var(--canvas-floor)", borderRadius: "var(--radius-md)", border: "1px solid var(--hairline)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Land Plots</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>{metrics.plotCount}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Demarcated parcels</div>
          </div>

          <div style={{ padding: "12px 14px", background: "var(--canvas-floor)", borderRadius: "var(--radius-md)", border: "1px solid var(--hairline)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Workforce</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>{metrics.officerCount}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Assigned field officers</div>
          </div>

          <div style={{ padding: "12px 14px", background: "var(--canvas-floor)", borderRadius: "var(--radius-md)", border: "1px solid var(--hairline)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Area</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
              {metrics.totalAcreage.toFixed(2)} ac
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Total acreage</div>
          </div>
        </div>

        {/* Detailed Account Attributes Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <Field label="Phone" value={client.phone} icon={<Icons.User size={11} />} />
          <Field label="Email" value={client.email} icon={<Icons.User size={11} />} />
          <Field label="Secondary Contact" value={client.secondaryContact} icon={<Icons.User size={11} />} />
          <Field label="Primary Location" value={[client.address, client.district, client.state].filter(Boolean).join(", ")} icon={<Icons.MapPin size={11} />} />
          <Field label="Billing Address" value={client.billingAddress} icon={<Icons.MapPin size={11} />} />
          <Field label="PAN" value={client.panNumber} icon={<Icons.Shield size={11} />} />
          <Field label="GSTIN" value={client.gstin} icon={<Icons.Shield size={11} />} />
          <Field label="Entity Type" value={client.entityType} icon={<Icons.Users size={11} />} />
        </div>
      </div>

      {/* ── 2. Farm Locations Spatial Map Box ── */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-lg)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
          <Icons.MapPin size={16} style={{ color: "var(--muted)" }} />
          <span>Authoritative Estate Locations</span>
        </div>
        <MiniMap pins={data.pins.items} hasMore={data.pins.hasMore} />
      </div>

      {/* ── 3. Segmented Navigation Tabs ── */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm ${tab === t.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab(t.id)}
            style={{ borderRadius: "var(--radius-pill)", padding: "6px 14px", fontWeight: 600, fontSize: 12 }}
          >
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab 1: Farms Portfolio ── */}
      {tab === "farms" && (
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--canvas-floor)", borderBottom: "1px solid var(--hairline)" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Farm ID</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Estate Name</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Stage</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Acreage</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Plots</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Boundary</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.farms.items.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <Empty title="No farms onboarded yet" hint="Use Add farm above to register the first estate for this client." />
                    </td>
                  </tr>
                ) : (
                  data.farms.items.map((f) => (
                    <tr key={f.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                      <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }} title={f.id}>
                        {f.id.slice(-8).toUpperCase()}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <Link href={`/hq/farms/${f.id}`} style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                          {f.name}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <StatusBadge status={f.status} />
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "var(--surface-strong)", fontWeight: 600 }}>
                          {f.setupStage.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {f.totalArea.toFixed(2)} ac
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600 }}>
                        {f.plotCount}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {f.hasBoundary ? (
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "rgba(34,197,94,0.12)", color: "#15803d", border: "1px solid rgba(34,197,94,0.25)", fontWeight: 600 }}>
                            &bull; Demarcated
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "rgba(245,158,11,0.12)", color: "#d97706", border: "1px solid rgba(245,158,11,0.25)", fontWeight: 600 }}>
                            &bull; Missing boundary
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <Link href={`/hq/farms/${f.id}`} className="btn btn-secondary btn-sm" style={{ padding: "3px 10px", fontSize: 12, borderRadius: "var(--radius-md)" }}>
                          Inspect &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data.farms.total > data.farms.limit && (
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--hairline)", fontSize: 12, color: "var(--muted)", background: "var(--canvas-floor)" }}>
              <span>Showing {(farmPage - 1) * data.farms.limit + 1} to {Math.min(farmPage * data.farms.limit, data.farms.total)} of {data.farms.total} farms</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="btn btn-secondary btn-sm" disabled={farmPage <= 1} onClick={() => setFarmPage((p) => p - 1)}>← Prev</button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={farmPage >= farmPages} onClick={() => setFarmPage((p) => p + 1)}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Land Plots ── */}
      {tab === "plots" && (
        <div style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--canvas-floor)", borderBottom: "1px solid var(--hairline)" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Plot ID</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Plot Name</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Estate</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Area</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.plots.items.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <Empty title="No land plots registered yet" hint="Plots are created during farm plot demarcation." />
                    </td>
                  </tr>
                ) : (
                  data.plots.items.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                      <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }} title={p.id}>
                        {p.id.slice(-8).toUpperCase()}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <Link href={`/plots/${p.id}`} style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                          {p.name}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <Link href={`/hq/farms/${p.farmId}`} style={{ color: "var(--ink)", textDecoration: "none" }}>
                          {p.farmName}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {p.area.toFixed(2)} ac
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <StatusBadge status={p.status} />
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <Link href={`/plots/${p.id}`} className="btn btn-secondary btn-sm" style={{ padding: "3px 10px", fontSize: 12, borderRadius: "var(--radius-md)" }}>
                          Inspect &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data.plots.total > data.plots.limit && (
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--hairline)", fontSize: 12, color: "var(--muted)", background: "var(--canvas-floor)" }}>
              <span>Showing {(plotPage - 1) * data.plots.limit + 1} to {Math.min(plotPage * data.plots.limit, data.plots.total)} of {data.plots.total} plots</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="btn btn-secondary btn-sm" disabled={plotPage <= 1} onClick={() => setPlotPage((p) => p - 1)}>← Prev</button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={plotPage >= plotPages} onClick={() => setPlotPage((p) => p + 1)}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Team & Labour ── */}
      {tab === "team" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {teamMsg && (
            <div style={{ padding: "10px 16px", background: "var(--surface-strong)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--ink)" }}>
              {teamMsg}
            </div>
          )}

          <div style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", marginBottom: 12 }}>
              Farm Admin Accounts ({admins.length})
            </div>
            {admins.length === 0 ? (
              <Empty title="No farm admin provisioned" hint="Admin accounts are created during estate onboarding." />
            ) : (
              admins.map((m) => (
                <TeamRow key={m.id} member={m} busy={teamBusy === m.id} onToggle={() => toggleActive(m)} onReset={() => resetPassword(m)} />
              ))
            )}
          </div>

          <div style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", marginBottom: 12 }}>
              Field Officers Hired per Estate ({officers.length})
            </div>
            {officers.length === 0 ? (
              <Empty title="No officers assigned" hint="Field officers appear here once assigned to this client's estates." />
            ) : (
              officers.map((m) => (
                <TeamRow key={m.id} member={m} busy={teamBusy === m.id} onToggle={() => toggleActive(m)} onReset={() => resetPassword(m)} />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Tab 4: Operational History ── */}
      {tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <HistorySection title="Crop Cycles">
            {data.history.cycles.length === 0 ? (
              <Empty title="No active crop cycles" hint="Cycles appear once planting commences on any plot." />
            ) : (
              data.history.cycles.map((c) => (
                <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--hairline)", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--ink)" }}>{c.cropName}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      Started {c.startDate} &bull; <Link href={`/plots/${c.plotId}`} style={{ color: "var(--ink)" }}>{c.plotName}</Link> &bull; {c.farmName}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))
            )}
          </HistorySection>

          <HistorySection title="Harvest Ledger">
            {data.history.harvests.length === 0 ? (
              <Empty title="No harvest records logged" />
            ) : (
              data.history.harvests.map((h) => (
                <div key={h.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--hairline)", fontSize: 13 }}>
                  <strong style={{ color: "var(--ink)" }}>{h.quantity} {h.unit}</strong> — {h.crop} ({h.grade})
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    Harvested {h.date} &bull; {h.plotName} &bull; {h.farmName}
                  </div>
                </div>
              ))
            )}
          </HistorySection>

          <HistorySection title="Incidents & Signals">
            {data.history.incidents.length === 0 ? (
              <Empty title="No field incidents reported" />
            ) : (
              data.history.incidents.map((i) => (
                <div key={i.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--hairline)", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--ink)" }}>{i.type}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {new Date(i.createdAt).toLocaleDateString()}{i.severity ? ` &bull; Severity ${i.severity}` : ""} &bull; {i.farmName}
                    </div>
                  </div>
                  <StatusBadge status={i.status} />
                </div>
              ))
            )}
          </HistorySection>
        </div>
      )}

      {/* ── Tab 5: Documents & Evidence ── */}
      {tab === "files" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", marginBottom: 12 }}>
              Document Files & Photo Evidence ({data.files.length})
            </div>
            {data.files.length === 0 ? (
              <Empty title="No documents or photo evidence uploaded" hint="Task evidence, crop photos, and officer selfies appear here." />
            ) : (
              data.files.map((f) => (
                <div key={f.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--hairline)", fontSize: 13 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "var(--surface-strong)", marginRight: 8 }}>
                    {f.kind.replaceAll("_", " ")}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{f.storageKey}</span>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {f.mimeType} &bull; {(f.sizeBytes / 1024).toFixed(1)} KB &bull; Uploaded {new Date(f.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamRow({
  member,
  busy,
  onToggle,
  onReset,
}: {
  member: TeamMember;
  busy: boolean;
  onToggle: () => void;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        padding: "12px 0",
        borderBottom: "1px solid var(--hairline)",
        fontSize: 13,
      }}
    >
      <div>
        <div style={{ fontWeight: 600, color: member.active ? "var(--ink)" : "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <span>{member.name}</span>
          {!member.active && (
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(239, 68, 68, 0.12)", color: "#dc2626", fontWeight: 700 }}>
              Inactive
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
          {member.role.replaceAll("_", " ")} &bull; {member.email}
          {member.phone ? ` &bull; ${member.phone}` : ""}
        </div>
        {member.farms.length > 0 && (
          <div style={{ fontSize: 12, color: "var(--body)", marginTop: 2 }}>
            Assigned: {member.farms.map((f) => f.name).join(", ")}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onToggle} style={{ borderRadius: "var(--radius-md)" }}>
          <span>{member.active ? "Deactivate" : "Reactivate"}</span>
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onReset} style={{ borderRadius: "var(--radius-md)" }}>
          <span>Reset Credentials</span>
        </button>
      </div>
    </div>
  );
}

function HistorySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-sm)" }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
