"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Sprout,
  Users,
} from "lucide-react";
import { Icons } from "@/components/icons";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const ClientFarmsMap = dynamic(
  () => import("@modules/estates/ui/client-farms-map").then((m) => m.ClientFarmsMap),
  { ssr: false, loading: () => <div className="c360-map c360-map-loading">Loading map…</div> }
);

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

type ActivityEntry = {
  id: string;
  kind: "cycle" | "harvest" | "incident" | "followup" | "task";
  title: string;
  meta: string;
  date: string;
  status?: string;
  href?: string;
};

function formatPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  const in91 = digits.match(/^\+91(\d{10})$/);
  if (in91) return `+91 ${in91[1].slice(0, 5)} ${in91[1].slice(5)}`;
  const local = digits.match(/^(\d{10})$/);
  if (local) return `${local[1].slice(0, 5)} ${local[1].slice(5)}`;
  return raw;
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatCoord(value: number, pos: string, neg: string): string {
  return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? pos : neg}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function buildActivity(data: Bundle): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const c of data.history.cycles) {
    entries.push({
      id: `cy-${c.id}`,
      kind: "cycle",
      title: `Crop cycle started — ${c.cropName}`,
      meta: `${c.plotName} · ${c.farmName}`,
      date: c.startDate,
      status: c.status,
      href: `/plots/${c.plotId}`,
    });
  }
  for (const h of data.history.harvests) {
    entries.push({
      id: `hv-${h.id}`,
      kind: "harvest",
      title: `Harvest logged — ${h.quantity} ${h.unit} ${h.crop}`,
      meta: `${h.plotName} · ${h.farmName} · Grade ${h.grade}`,
      date: h.date,
      href: `/hq/farms/${h.farmId}`,
    });
  }
  for (const i of data.history.incidents) {
    entries.push({
      id: `in-${i.id}`,
      kind: "incident",
      title: `Incident — ${i.type}`,
      meta: i.plotName ? `${i.plotName} · ${i.farmName}` : i.farmName,
      date: i.createdAt,
      status: i.status,
      href: `/hq/farms/${i.farmId}`,
    });
  }
  for (const n of data.notes) {
    entries.push({
      id: `nt-${n.id}`,
      kind: "followup",
      title: `Follow-up — ${n.action}`,
      meta: `${n.authorName} · ${n.incidentType} · ${n.farmName}`,
      date: n.createdAt,
      href: `/hq/farms/${n.farmId}`,
    });
  }
  for (const t of data.history.tasks) {
    entries.push({
      id: `tk-${t.id}`,
      kind: "task",
      title: `Task — ${t.title}`,
      meta: `Due ${formatDate(t.dueDate)} · ${t.farmName}`,
      date: t.dueDate,
      status: t.status,
    });
  }

  return entries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12);
}

const ACTIVITY_ICON: Record<ActivityEntry["kind"], ReactNode> = {
  cycle: <Sprout size={14} />,
  harvest: <CheckCircle2 size={14} />,
  incident: <AlertTriangle size={14} />,
  followup: <ClipboardList size={14} />,
  task: <ClipboardList size={14} />,
};

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="c360-section">
      <div className="c360-section-head">
        <h2 className="c360-section-title">
          <span>{title}</span>
          {typeof count === "number" && <span className="c360-count">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoItem({ label, value, icon }: { label: string; value?: string | null; icon?: ReactNode }) {
  const shown = value && value.trim() ? value : null;
  return (
    <div className="c360-info-item">
      <span className="c360-info-label">
        {icon}
        {label}
      </span>
      {shown ? <span className="c360-info-value">{shown}</span> : <span className="c360-info-empty">Not provided</span>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="c360-metric">
      <span className="c360-metric-label">{label}</span>
      <span className="c360-metric-value">{value}</span>
    </div>
  );
}

export function Client360({
  clientId,
  canEditClient = false,
  canCreateFarm = false,
}: {
  clientId: string;
  canEditClient?: boolean;
  canCreateFarm?: boolean;
}) {
  const [data, setData] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farmPage, setFarmPage] = useState(1);
  const [plotPage, setPlotPage] = useState(1);
  const locItemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [teamMsg, setTeamMsg] = useState<string | null>(null);
  const [teamBusy, setTeamBusy] = useState<string | null>(null);
  const [focusPinId, setFocusPinId] = useState<string | null>(null);
  const [fitToken, setFitToken] = useState(0);

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
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  // Keep the estate-locations panel in sync when a map marker is selected.
  useEffect(() => {
    if (!focusPinId) return;
    locItemRefs.current[focusPinId]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusPinId]);

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

  const toggleActive = (m: TeamMember) => {
    if (m.active && !confirm(`Deactivate ${m.name}? They will lose access immediately.`)) return;
    void teamAction(m.id, { active: !m.active }, m.active ? "Deactivation" : "Reactivation");
  };

  const resetPassword = (m: TeamMember) => {
    const next = prompt(`Set a new password for ${m.name} (min 12 characters):`);
    if (!next) return;
    if (next.length < 12) {
      setTeamMsg("Password must be at least 12 characters.");
      return;
    }
    void teamAction(m.id, { password: next }, "Credential reset");
  };

  if (loading && !data) {
    return (
      <div className="c360">
        <div className="c360-header">
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Skeleton width={48} height={48} borderRadius="50%" />
            <div style={{ display: "grid", gap: 8, flex: 1 }}>
              <Skeleton width={220} height={20} />
              <Skeleton width={300} height={13} />
              <Skeleton width={240} height={13} />
            </div>
          </div>
          <div className="c360-metrics">
            {[0, 1, 2, 3].map((i) => (
              <div className="c360-metric" key={i}>
                <Skeleton width={64} height={11} />
                <div style={{ height: 8 }} />
                <Skeleton width={72} height={22} />
              </div>
            ))}
          </div>
        </div>
        <div className="c360-section">
          <Skeleton width={180} height={18} />
          <div style={{ height: 14 }} />
          <Skeleton width="100%" height={92} />
        </div>
        <div className="c360-grid-2">
          <div className="c360-section">
            <Skeleton width={160} height={18} />
            <div style={{ height: 14 }} />
            <Skeleton width="100%" height={150} />
          </div>
          <div className="c360-section">
            <Skeleton width={120} height={18} />
            <div style={{ height: 14 }} />
            <Skeleton width="100%" height={150} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="c360-section" style={{ textAlign: "center", padding: 48 }}>
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
            <span>Back to Clients</span>
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
  const editClientHref = `/hq/clients/${client.id}/edit`;
  const addFarmHref = `/hq/clients/${client.id}/farms/new`;
  const locationText = [client.district, client.state].filter(Boolean).join(", ");
  const fullAddress = [client.address, client.district, client.state].filter(Boolean).join(", ");

  const officersByFarm = new Map<string, TeamMember[]>();
  for (const m of data.team) {
    for (const fa of m.farms) {
      const list = officersByFarm.get(fa.id) ?? [];
      list.push(m);
      officersByFarm.set(fa.id, list);
    }
  }

  const activity = buildActivity(data);
  const pins = data.pins.items.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.latitude,
    lng: p.longitude,
    status: p.status,
    coord: `${formatCoord(p.latitude, "N", "S")}, ${formatCoord(p.longitude, "E", "W")}`,
  }));

  return (
    <div className="c360">
      {/* ── Client header ── */}
      <header className="c360-header">
        <div className="c360-header-top">
          <div className="c360-identity">
            <div className="c360-avatar">{initials(client.name)}</div>
            <div className="c360-identity-text">
              <div className="c360-name-row">
                <h1 className="c360-name">{client.name}</h1>
                <span className="c360-code">{client.code}</span>
                <StatusBadge status={client.status} />
              </div>
              <div className="c360-sub">
                {client.entityType && (
                  <span className="c360-entity">
                    <Building2 size={12} />
                    {client.entityType}
                  </span>
                )}
                {client.companyName && <span>{client.companyName}</span>}
                <span className="c360-client-id">ID {client.id}</span>
              </div>
              <div className="c360-contact-row">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="c360-contact-item">
                    <Phone size={13} />
                    {formatPhone(client.phone)}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="c360-contact-item">
                    <Mail size={13} />
                    {client.email}
                  </a>
                )}
                {locationText && (
                  <span className="c360-contact-item">
                    <MapPin size={13} />
                    {locationText}
                  </span>
                )}
              </div>
            </div>
          </div>

          {(canEditClient || canCreateFarm) && (
            <div className="c360-actions">
              {canEditClient && (
                <Link href={editClientHref} className="btn btn-secondary btn-sm" title="Edit client details">
                  <Pencil size={13} />
                  <span>Edit Client</span>
                </Link>
              )}
              {canCreateFarm && (
                <Link href={addFarmHref} className="btn btn-primary btn-sm" title="Add a new farm estate for this client">
                  <Plus size={14} />
                  <span>Add Farm Estate</span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Metrics strip */}
        <div className="c360-metrics">
          <Metric label="Farms" value={metrics.farmCount} />
          <Metric label="Land Plots" value={metrics.plotCount} />
          <Metric label="Total Area" value={`${metrics.totalAcreage.toFixed(2)} ac`} />
          <Metric label="Workforce" value={metrics.officerCount} />
        </div>
      </header>

      {/* ── Farms & Estates ── */}
      <Section
        title="Farms & Estates"
        count={data.farms.total}
        action={
          canCreateFarm ? (
            <Link href={addFarmHref} className="btn btn-primary btn-sm">
              <Plus size={14} />
              <span>Add Farm Estate</span>
            </Link>
          ) : undefined
        }
      >
        {data.farms.items.length === 0 ? (
          <EmptyState
            icon={<Icons.Farm size={22} />}
            title="No farms added yet"
            description="Add a farm estate to start tracking operations."
            action={
              canCreateFarm ? (
                <Link href={addFarmHref} className="btn btn-primary btn-sm">
                  <Plus size={14} />
                  <span>Add Farm Estate</span>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="c360-farm-list">
              {data.farms.items.map((f) => {
                const farmOfficers = officersByFarm.get(f.id) ?? [];
                return (
                  <article key={f.id} className="c360-farm-card">
                    <div className="c360-farm-main">
                      <div className="c360-farm-title">
                        <Link href={`/hq/farms/${f.id}`} className="c360-farm-name">
                          {f.name}
                        </Link>
                        <StatusBadge status={f.status} />
                      </div>
                      <div className="c360-farm-meta">
                        <span className="c360-tag">{f.setupStage.replaceAll("_", " ")}</span>
                        <span>{f.totalArea.toFixed(2)} ac</span>
                        <span>
                          {f.plotCount} plot{f.plotCount === 1 ? "" : "s"}
                        </span>
                        <span className={f.hasBoundary ? "c360-ok" : "c360-warn"}>
                          {f.hasBoundary ? "Boundary demarcated" : "Boundary missing"}
                        </span>
                      </div>
                      {farmOfficers.length > 0 && (
                        <div className="c360-farm-officers">
                          <Users size={12} />
                          {farmOfficers.map((o) => o.name).join(", ")}
                        </div>
                      )}
                    </div>
                    <Link href={`/hq/farms/${f.id}`} className="btn btn-secondary btn-sm">
                      <span>View farm</span>
                      <ArrowRight size={13} />
                    </Link>
                  </article>
                );
              })}
            </div>

            {data.farms.total > data.farms.limit && (
              <div className="c360-pagination">
                <span>
                  Showing {(farmPage - 1) * data.farms.limit + 1}–
                  {Math.min(farmPage * data.farms.limit, data.farms.total)} of {data.farms.total} farms
                </span>
                <div className="c360-pagination-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={farmPage <= 1}
                    onClick={() => setFarmPage((p) => p - 1)}
                  >
                    <Icons.ChevronLeft size={13} /> Prev
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={farmPage >= farmPages}
                    onClick={() => setFarmPage((p) => p + 1)}
                  >
                    Next <Icons.ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Section>

      {/* ── Client information + Contacts ── */}
      <div className="c360-grid-2">
        <Section
          title="Client Information"
          action={
            canOnboard ? (
              <Link href={editHref} className="btn btn-secondary btn-sm">
                <Pencil size={12} />
                <span>Edit information</span>
              </Link>
            ) : undefined
          }
        >
          <div className="c360-info-grid">
            <InfoItem label="Phone" value={formatPhone(client.phone)} icon={<Phone size={11} />} />
            <InfoItem label="Email" value={client.email} icon={<Mail size={11} />} />
            <InfoItem label="Secondary Contact" value={client.secondaryContact} icon={<Users size={11} />} />
            <InfoItem label="Entity Type" value={client.entityType} icon={<Building2 size={11} />} />
            <InfoItem label="PAN" value={client.panNumber} icon={<Icons.Shield size={11} />} />
            <InfoItem label="GSTIN" value={client.gstin} icon={<Icons.Shield size={11} />} />
            <InfoItem label="Billing Address" value={client.billingAddress} icon={<MapPin size={11} />} />
            <InfoItem label="Primary Location" value={fullAddress} icon={<MapPin size={11} />} />
          </div>
        </Section>

        <Section title="Contacts">
          <div className="c360-contact-list">
            <div className="c360-contact-card">
              <div className="c360-contact-role">Primary contact</div>
              <div className="c360-contact-name">{client.name}</div>
              {client.phone && (
                <a href={`tel:${client.phone}`} className="c360-contact-line">
                  <Phone size={13} />
                  {formatPhone(client.phone)}
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="c360-contact-line">
                  <Mail size={13} />
                  {client.email}
                </a>
              )}
              {!client.phone && !client.email && <span className="c360-info-empty">No contact assigned</span>}
            </div>

            <div className="c360-contact-card">
              <div className="c360-contact-role">Secondary contact</div>
              {client.secondaryContact ? (
                <div className="c360-contact-name">{client.secondaryContact}</div>
              ) : (
                <span className="c360-info-empty">Not provided</span>
              )}
            </div>
          </div>
        </Section>
      </div>

      {/* ── Location & Estates ── */}
      <Section
        title="Location & Estates"
        action={
          <div className="c360-section-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setFitToken((t) => t + 1)}
              disabled={pins.length === 0}
            >
              <Icons.Maximize2 size={13} />
              <span>Fit all</span>
            </button>
            <Link href="/spatial" className="btn btn-secondary btn-sm">
              <span>Open Spatial Console</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        }
      >
        <p className="c360-section-desc">View and manage all registered farm locations.</p>

        {pins.length === 0 ? (
          <EmptyState
            icon={<MapPin size={22} />}
            title="No estate locations yet"
            description="Add a farm location to see it here."
            action={
              canOnboard ? (
                <Link href={editHref} className="btn btn-primary btn-sm">
                  <Plus size={14} />
                  <span>Add Farm Estate</span>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="c360-location">
            <ClientFarmsMap
              pins={pins}
              focusId={focusPinId}
              fitToken={fitToken}
              onSelectPin={(id) => setFocusPinId(id)}
            />

            <div className="c360-loc-panel">
              <div className="c360-loc-panel-head">
                <span className="c360-loc-panel-title">Estate Locations</span>
                <span className="c360-loc-panel-count">
                  {pins.length} location{pins.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="c360-loc-list">
                {pins.map((p) => {
                  const selected = focusPinId === p.id;
                  return (
                    <li
                      key={p.id}
                      ref={(el) => {
                        locItemRefs.current[p.id] = el;
                      }}
                      className={`c360-loc-item ${selected ? "selected" : ""}`}
                    >
                      <button
                        type="button"
                        className="c360-loc-select"
                        onClick={() => setFocusPinId(p.id)}
                        aria-pressed={selected}
                      >
                        <span className="c360-loc-item-top">
                          <span className="c360-loc-item-name">{p.name}</span>
                          <span className={`c360-loc-status ${p.status.toLowerCase()}`} title={p.status} />
                        </span>
                        <span className="c360-loc-item-coord">{p.coord}</span>
                      </button>
                      <Link href={`/hq/farms/${p.id}`} className="c360-loc-view">
                        <span>View Estate</span>
                        <ArrowRight size={12} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </Section>

      {/* ── Recent activity ── */}
      <Section title="Recent Activity">
        {activity.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={22} />}
            title="No activity recorded yet"
            description="Crop cycles, harvests, incidents and tasks will appear here as field operations run."
          />
        ) : (
          <ol className="c360-timeline">
            {activity.map((a) => (
              <li key={a.id} className={`c360-timeline-item ${a.kind}`}>
                <span className="c360-timeline-icon">{ACTIVITY_ICON[a.kind]}</span>
                <div className="c360-timeline-body">
                  <div className="c360-timeline-title">{a.title}</div>
                  <div className="c360-timeline-meta">{a.meta}</div>
                </div>
                <div className="c360-timeline-side">
                  <span className="c360-timeline-date">{formatDate(a.date)}</span>
                  {a.status && <StatusBadge status={a.status} />}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* ── Land plots ── */}
      <Section title="Land Plots" count={data.plots.total}>
        <div className="c360-table-wrap">
          <div style={{ overflowX: "auto" }}>
            <table className="c360-table">
              <thead>
                <tr>
                  <th>Plot</th>
                  <th>Estate</th>
                  <th style={{ textAlign: "right" }}>Area</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {data.plots.items.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="c360-table-empty">No land plots registered yet. Plots are created during farm demarcation.</div>
                    </td>
                  </tr>
                ) : (
                  data.plots.items.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/plots/${p.id}`} className="c360-link">
                          {p.name}
                        </Link>
                        <div className="c360-row-sub">{p.id.slice(-8).toUpperCase()}</div>
                      </td>
                      <td>
                        <Link href={`/hq/farms/${p.farmId}`} className="c360-link-muted">
                          {p.farmName}
                        </Link>
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{p.area.toFixed(2)} ac</td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/plots/${p.id}`} className="btn btn-secondary btn-sm">
                          <span>Inspect</span>
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {data.plots.total > data.plots.limit && (
          <div className="c360-pagination">
            <span>
              Showing {(plotPage - 1) * data.plots.limit + 1}–
              {Math.min(plotPage * data.plots.limit, data.plots.total)} of {data.plots.total} plots
            </span>
            <div className="c360-pagination-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={plotPage <= 1}
                onClick={() => setPlotPage((p) => p - 1)}
              >
                <Icons.ChevronLeft size={13} /> Prev
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={plotPage >= plotPages}
                onClick={() => setPlotPage((p) => p + 1)}
              >
                Next <Icons.ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* ── Team & workforce ── */}
      <Section title="Team & Workforce" count={data.team.length}>
        {teamMsg && (
          <div className="c360-note" role="status">
            {teamMsg}
          </div>
        )}

        <div className="c360-team-group">
          <div className="c360-team-heading">Farm admin accounts ({admins.length})</div>
          {admins.length === 0 ? (
            <div className="c360-mini-empty">No farm admin provisioned.</div>
          ) : (
            admins.map((m) => (
              <TeamRow
                key={m.id}
                member={m}
                busy={teamBusy === m.id}
                onToggle={() => toggleActive(m)}
                onReset={() => resetPassword(m)}
              />
            ))
          )}
        </div>

        <div className="c360-team-group">
          <div className="c360-team-heading">Field officers ({officers.length})</div>
          {officers.length === 0 ? (
            <div className="c360-mini-empty">No officers assigned.</div>
          ) : (
            officers.map((m) => (
              <TeamRow
                key={m.id}
                member={m}
                busy={teamBusy === m.id}
                onToggle={() => toggleActive(m)}
                onReset={() => resetPassword(m)}
              />
            ))
          )}
        </div>
      </Section>

      {/* ── Documents & evidence ── */}
      <Section title="Documents & Evidence" count={data.files.length}>
        {data.files.length === 0 ? (
          <EmptyState
            icon={<FileText size={22} />}
            title="No documents or evidence uploaded"
            description="Task evidence, crop photos and officer selfies appear here."
          />
        ) : (
          <div className="c360-file-list">
            {data.files.map((f) => (
              <div key={f.id} className="c360-file-row">
                <span className="c360-file-kind">{f.kind.replaceAll("_", " ")}</span>
                <span className="c360-file-key">{f.storageKey}</span>
                <span className="c360-file-meta">
                  {f.mimeType} · {(f.sizeBytes / 1024).toFixed(1)} KB · {formatDate(f.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
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
    <div className="c360-team-row">
      <div>
        <div className="c360-team-name">
          <span>{member.name}</span>
          {!member.active && <span className="c360-inactive-tag">Inactive</span>}
        </div>
        <div className="c360-team-meta">
          {member.role.replaceAll("_", " ")} · {member.email}
          {member.phone ? ` · ${member.phone}` : ""}
        </div>
        {member.farms.length > 0 && (
          <div className="c360-team-farms">Assigned: {member.farms.map((f) => f.name).join(", ")}</div>
        )}
      </div>
      <div className="c360-team-actions">
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onToggle}>
          <span>{member.active ? "Deactivate" : "Reactivate"}</span>
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onReset}>
          <RefreshCw size={12} />
          <span>Reset credentials</span>
        </button>
      </div>
    </div>
  );
}
