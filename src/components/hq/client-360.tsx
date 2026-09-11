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
      id: string; date: string; quantity: number; unit: string; grade: string;
      crop: string; farmId: string; farmName: string; plotName: string;
    }>;
    incidents: Array<{
      id: string; type: string; severity: string | null; status: string;
      createdAt: string; farmId: string; farmName: string; plotName: string | null;
    }>;
    tasks: Array<{
      id: string; title: string; category: string; status: string;
      dueDate: string; farmId: string; farmName: string;
    }>;
    cycles: Array<{
      id: string; cropName: string; status: string; startDate: string;
      plotId: string; plotName: string; farmId: string; farmName: string;
    }>;
  };
  files: Array<{
    id: string; storageKey: string; kind: string; mimeType: string;
    sizeBytes: number; farmId: string | null; createdAt: string;
  }>;
  notes: Array<{
    id: string; action: string; remarks: string | null; authorName: string;
    incidentId: string; incidentType: string; farmId: string; farmName: string; createdAt: string;
  }>;
}

type Tab = "farms" | "plots" | "team" | "history" | "files";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "farms", label: "Farms" },
  { id: "plots", label: "Plots" },
  { id: "team", label: "Team & Labour" },
  { id: "history", label: "History" },
  { id: "files", label: "Files / Notes" },
];

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-lg)",
  padding: 16,
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 2 }}>{value || "—"}</div>
    </div>
  );
}

function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ textAlign: "center", padding: 32 }}>
      <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13 }}>{title}</div>
      {hint && <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

function MiniMap({ pins, hasMore }: { pins: Pin[]; hasMore: boolean }) {
  if (pins.length === 0) {
    return <Empty title="No farm locations yet" hint="Pins appear here once farms are onboarded." />;
  }
  const lats = pins.map((p) => p.latitude);
  const lngs = pins.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const W = 100;
  const H = 56;
  const PAD = 8;
  const x = (lng: number) =>
    maxLng === minLng ? W / 2 : PAD + ((lng - minLng) / (maxLng - minLng)) * (W - PAD * 2);
  const y = (lat: number) =>
    maxLat === minLat ? H / 2 : PAD + ((maxLat - lat) / (maxLat - minLat)) * (H - PAD * 2);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: 220, background: "var(--surface-strong)", borderRadius: 8 }}
        role="img"
        aria-label="Map of client farms"
      >
        {pins.map((p) => (
          <Link key={p.id} href={`/hq/farms/${p.id}`} title={`${p.name} — open farm`}>
            <circle
              cx={x(p.longitude)}
              cy={y(p.latitude)}
              r={2.6}
              fill={p.status === "ACTIVE" ? "var(--green-ink)" : "var(--amber)"}
              stroke="var(--surface)"
              strokeWidth={0.8}
              style={{ cursor: "pointer" }}
            >
              <title>{p.name} — open farm</title>
            </circle>
          </Link>
        ))}
      </svg>
      <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
        {pins.length} farm pin(s) plotted{hasMore ? " — showing most recent 200" : ""}. Select a pin to open the farm.
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
    return <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>Loading client 360…</div>;
  }

  if (error || !data) {
    return (
      <div style={{ ...card, textAlign: "center", padding: 48 }}>
        <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
          {error || "Client not found."}
        </div>
        <p className="muted" style={{ fontSize: 12, margin: "0 0 12px" }}>
          The client may have been removed, or you may lack access.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
            <span>Retry</span>
          </button>
          <Link href="/hq/clients" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
            <span>Back to directory</span>
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="muted" style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>
              CLIENT ID: {client.id}
            </div>
            <h2 style={{ fontSize: 20, margin: "2px 0", color: "var(--ink)" }}>{client.name}</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="badge badge-stone" style={{ fontSize: 11 }}>{client.code}</span>
              <StatusBadge status={client.status} />
              {client.companyName && <span className="muted" style={{ fontSize: 12 }}>{client.companyName}</span>}
            </div>
          </div>
          <Link
            href={`/hq/onboarding/new?clientId=${client.id}`}
            className="btn btn-primary btn-sm"
            style={{ textDecoration: "none" }}
            title="Open the onboarding wizard with this client prefilled"
          >
            <Icons.Plus size={14} />
            <span>Add farm</span>
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <Field label="Phone" value={client.phone} />
          <Field label="Email" value={client.email} />
          <Field label="Secondary contact" value={client.secondaryContact} />
          <Field label="Address" value={[client.address, client.district, client.state].filter(Boolean).join(", ")} />
          <Field label="Billing address" value={client.billingAddress} />
          <Field label="PAN" value={client.panNumber} />
          <Field label="GSTIN" value={client.gstin} />
          <Field label="Entity type" value={client.entityType} />
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
          <span><strong>{metrics.farmCount}</strong> <span className="muted">farms</span></span>
          <span><strong>{metrics.plotCount}</strong> <span className="muted">plots</span></span>
          <span><strong>{metrics.officerCount}</strong> <span className="muted">officers</span></span>
          <span><strong>{metrics.totalAcreage.toFixed(2)} ac</strong> <span className="muted">total</span></span>
        </div>
      </div>

      {/* Mini-map */}
      <div style={card}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 8 }}>
          Farm locations
        </div>
        <MiniMap pins={data.pins.items} hasMore={data.pins.hasMore} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm ${tab === t.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "farms" && (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Farm ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Stage</th>
                  <th>Acreage</th>
                  <th>Plots</th>
                  <th>Boundary</th>
                </tr>
              </thead>
              <tbody>
                {data.farms.items.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <Empty title="No farms yet" hint="Use Add farm to onboard the first estate for this client." />
                    </td>
                  </tr>
                ) : (
                  data.farms.items.map((f) => (
                    <tr key={f.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} title={f.id}>
                        {f.id.slice(-8).toUpperCase()}
                      </td>
                      <td>
                        <Link href={`/hq/farms/${f.id}`} style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                          {f.name}
                        </Link>
                      </td>
                      <td><StatusBadge status={f.status} /></td>
                      <td><span className="muted" style={{ fontSize: 12 }}>{f.setupStage.replaceAll("_", " ")}</span></td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{f.totalArea.toFixed(2)} ac</td>
                      <td>{f.plotCount}</td>
                      <td>
                        {f.hasBoundary ? (
                          <span className="badge badge-green" style={{ fontSize: 11 }}>Demarcated</span>
                        ) : (
                          <span className="badge badge-amber" style={{ fontSize: 11 }}>Missing boundary</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data.farms.total > data.farms.limit && (
            <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--muted)" }}>
              <span>Showing {(farmPage - 1) * data.farms.limit + 1} to {Math.min(farmPage * data.farms.limit, data.farms.total)} of {data.farms.total} farms</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-secondary btn-sm" disabled={farmPage <= 1} onClick={() => setFarmPage((p) => p - 1)}>Previous</button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={farmPage >= farmPages} onClick={() => setFarmPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "plots" && (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Plot ID</th>
                  <th>Name</th>
                  <th>Farm</th>
                  <th>Area</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.plots.items.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <Empty title="No plots yet" hint="Plots appear here once farm demarcation creates them." />
                    </td>
                  </tr>
                ) : (
                  data.plots.items.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} title={p.id}>
                        {p.id.slice(-8).toUpperCase()}
                      </td>
                      <td>
                        <Link href={`/plots/${p.id}`} style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                          {p.name}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/hq/farms/${p.farmId}?tab=map`} style={{ color: "var(--ink)", textDecoration: "none" }}>
                          {p.farmName}
                        </Link>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{p.area.toFixed(2)} ac</td>
                      <td><StatusBadge status={p.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data.plots.total > data.plots.limit && (
            <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--muted)" }}>
              <span>Showing {(plotPage - 1) * data.plots.limit + 1} to {Math.min(plotPage * data.plots.limit, data.plots.total)} of {data.plots.total} plots</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-secondary btn-sm" disabled={plotPage <= 1} onClick={() => setPlotPage((p) => p - 1)}>Previous</button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={plotPage >= plotPages} onClick={() => setPlotPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "team" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {teamMsg && (
            <div style={{ ...card, fontSize: 13, color: "var(--ink)" }}>{teamMsg}</div>
          )}
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 8 }}>
              Farm admin account
            </div>
            {admins.length === 0 ? (
              <Empty title="No farm admin provisioned" hint="Onboard the client owner through the admin onboarding flow." />
            ) : (
              admins.map((m) => (
                <TeamRow key={m.id} member={m} busy={teamBusy === m.id} onToggle={() => toggleActive(m)} onReset={() => resetPassword(m)} />
              ))
            )}
          </div>
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 8 }}>
              Officers hired per farm
            </div>
            {officers.length === 0 ? (
              <Empty title="No officers hired" hint="Officers appear here once assigned to this client's farms." />
            ) : (
              officers.map((m) => (
                <TeamRow key={m.id} member={m} busy={teamBusy === m.id} onToggle={() => toggleActive(m)} onReset={() => resetPassword(m)} />
              ))
            )}
            {data.teamCapped && (
              <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                Showing the 50 most recent accounts.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <HistorySection title="Crop cycles">
            {data.history.cycles.length === 0 ? (
              <Empty title="No crop cycles" hint="Cycles appear once planting starts on any plot." />
            ) : (
              data.history.cycles.map((c) => (
                <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--stone)", fontSize: 13 }}>
                  <strong>{c.cropName}</strong> <StatusBadge status={c.status} />
                  <div className="muted" style={{ fontSize: 12 }}>
                    Started {c.startDate} — <Link href={`/plots/${c.plotId}`} style={{ color: "inherit" }}>{c.plotName}</Link> · <Link href={`/farms/${c.farmId}`} style={{ color: "inherit" }}>{c.farmName}</Link>
                  </div>
                </div>
              ))
            )}
          </HistorySection>
          <HistorySection title="Harvests">
            {data.history.harvests.length === 0 ? (
              <Empty title="No harvests recorded" />
            ) : (
              data.history.harvests.map((h) => (
                <div key={h.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--stone)", fontSize: 13 }}>
                  <strong>{h.quantity} {h.unit}</strong> {h.crop} ({h.grade})
                  <div className="muted" style={{ fontSize: 12 }}>
                    {h.date} — {h.plotName} · <Link href={`/farms/${h.farmId}`} style={{ color: "inherit" }}>{h.farmName}</Link>
                  </div>
                </div>
              ))
            )}
          </HistorySection>
          <HistorySection title="Incidents">
            {data.history.incidents.length === 0 ? (
              <Empty title="No incidents reported" />
            ) : (
              data.history.incidents.map((i) => (
                <div key={i.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--stone)", fontSize: 13 }}>
                  <strong>{i.type}</strong> <StatusBadge status={i.status} />
                  <div className="muted" style={{ fontSize: 12 }}>
                    {new Date(i.createdAt).toLocaleDateString()}{i.severity ? ` — severity ${i.severity}` : ""}{i.plotName ? ` — ${i.plotName}` : ""} · <Link href={`/farms/${i.farmId}`} style={{ color: "inherit" }}>{i.farmName}</Link>
                  </div>
                </div>
              ))
            )}
          </HistorySection>
          <HistorySection title="Tasks">
            {data.history.tasks.length === 0 ? (
              <Empty title="No tasks yet" />
            ) : (
              data.history.tasks.map((t) => (
                <div key={t.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--stone)", fontSize: 13 }}>
                  <strong>{t.title}</strong> <StatusBadge status={t.status} />
                  <div className="muted" style={{ fontSize: 12 }}>
                    {t.category} — due {t.dueDate} · <Link href={`/farms/${t.farmId}`} style={{ color: "inherit" }}>{t.farmName}</Link>
                  </div>
                </div>
              ))
            )}
          </HistorySection>
        </div>
      )}

      {tab === "files" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 8 }}>Files</div>
            {data.files.length === 0 ? (
              <Empty title="No files uploaded" hint="Task evidence, crop photos, and selfies appear here." />
            ) : (
              data.files.map((f) => (
                <div key={f.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--stone)", fontSize: 13 }}>
                  <span className="badge badge-stone" style={{ fontSize: 10, marginRight: 8 }}>{f.kind.replaceAll("_", " ")}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{f.storageKey}</span>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {f.mimeType} — {(f.sizeBytes / 1024).toFixed(1)} KB — {new Date(f.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
            {data.filesCapped && (
              <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                Farm list exceeds 500 — files cover the first 500 farms.
              </div>
            )}
          </div>
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 8 }}>Notes</div>
            {data.notes.length === 0 ? (
              <Empty title="No notes yet" hint="Incident follow-up remarks appear here." />
            ) : (
              data.notes.map((n) => (
                <div key={n.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--stone)", fontSize: 13 }}>
                  <strong>{n.action}</strong>
                  <span className="muted" style={{ fontSize: 12 }}> — {n.authorName} on {n.incidentType} · <Link href={`/farms/${n.farmId}`} style={{ color: "inherit" }}>{n.farmName}</Link></span>
                  {n.remarks && <div style={{ fontSize: 13, marginTop: 2 }}>{n.remarks}</div>}
                  <div className="muted" style={{ fontSize: 11 }}>{new Date(n.createdAt).toLocaleString()}</div>
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
        padding: "10px 0",
        borderBottom: "1px solid var(--stone)",
        fontSize: 13,
      }}
    >
      <div>
        <div style={{ fontWeight: 600, color: member.active ? "var(--ink)" : "var(--muted)" }}>
          {member.name}
          {!member.active && <span className="badge badge-stone" style={{ fontSize: 10, marginLeft: 8 }}>Inactive</span>}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {member.role.replaceAll("_", " ")} · {member.email}
          {member.phone ? ` · ${member.phone}` : ""}
        </div>
        {member.farms.length > 0 && (
          <div className="muted" style={{ fontSize: 12 }}>
            {member.farms.map((f) => f.name).join(", ")}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onToggle}>
          <span>{member.active ? "Deactivate" : "Reactivate"}</span>
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onReset}>
          <span>Reset credentials</span>
        </button>
      </div>
    </div>
  );
}

function HistorySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}
