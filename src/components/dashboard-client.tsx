"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";
import { EmptyState } from "./ui/empty-state";
import { StatusBadge, RoleBadge } from "./ui/badge";
import { useToast } from "./ui/toast";
import { formatTime } from "@/lib/business";

type Farm = {
  id: string;
  name: string;
  location: string;
  ownerName: string;
  status: string;
  totalArea: string;
  cultivableArea: string;
  adminName: string;
  officerCount: number;
  todayAttendanceCount: number;
  todayTasksTotal: number;
  todayTasksCompleted: number;
  plots: {
    id: string;
    name: string;
    cropCycles: { id: string; cropName: string; status: string }[];
  }[];
  access: { user: { id: string; name: string; role: string } }[];
};

type MetricData = {
  totalFarms: number;
  activeFarms: number;
  setupFarms: number;
  totalPlots: number;
  totalCrops: number;
  totalTasks: number;
  completedTasks: number;
  delayedAlerts: number;
  pendingIncidents: number;
};

type WorkforceSummary = {
  totalOfficers: number;
  onDutyCount: number;
  completedCount: number;
  exceptionPendingCount: number;
  notClockedInCount: number;
  withinGeofenceCount: number;
  complianceRate: number;
};

type RosterPreviewItem = {
  attendanceId: string;
  officerId: string;
  officerName: string;
  officerEmail: string;
  farmId: string;
  farmName: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  distanceMeters: number | null;
  withinGeofence: boolean;
  startSelfieKey: string | null;
  exceptionId: string | null;
  exceptionReason: string | null;
};

type PendingException = {
  id: string;
  distanceMeters: number;
  reason: string;
  officerName: string;
  officerEmail: string;
  farmName: string;
  farmId: string;
  time: string | null;
};

type PendingLocation = {
  id: string;
  farmId: string;
  farmName: string;
  farmLocation: string;
  proposedLat: string;
  proposedLng: string;
  reason: string;
  date: string;
};

type Alert = {
  id: string;
  cropName: string;
  plotName: string;
  farmName: string;
  farmId: string;
  stage: string;
  impactPercent: string | null;
  remarks: string | null;
  imageUrl?: string | null;
  date: string;
};

type Incident = {
  id: string;
  type: string;
  severity: string;
  description: string;
  impactPercent?: string | null;
  farmName: string;
  farmId: string;
  plotName?: string;
  cropName?: string;
  status: string;
  imageUrl?: string | null;
  date: string;
};

export function DashboardClient({
  farms,
  metrics,
  workforceSummary,
  rosterPreview = [],
  pendingExceptions = [],
  pendingLocations = [],
  poorHealthAlerts = [],
  activeIncidents = [],
  userName = "Administrator",
  role = "SUPER_ADMIN",
}: {
  farms: Farm[];
  metrics: MetricData;
  workforceSummary: WorkforceSummary;
  rosterPreview?: RosterPreviewItem[];
  pendingExceptions?: PendingException[];
  pendingLocations?: PendingLocation[];
  poorHealthAlerts?: Alert[];
  activeIncidents?: Incident[];
  userName?: string;
  role?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Selfies lightbox modal
  const [lightboxSelfie, setLightboxSelfie] = useState<{
    url: string | null;
    officer: string;
    loading: boolean;
  } | null>(null);

  // Incident detail lightbox modal
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const isSuperAdmin = role === "SUPER_ADMIN";
  const isFarmAdmin = role === "FARM_ADMIN";

  const totalPendingApprovals =
    pendingExceptions.length + pendingLocations.length;

  const actionItemsCount =
    pendingExceptions.length +
    pendingLocations.length +
    activeIncidents.length +
    poorHealthAlerts.length;

  const [activeConsoleTab, setActiveConsoleTab] = useState<
    "ACTIONS" | "WORKFORCE" | "ESTATES"
  >(actionItemsCount > 0 ? "ACTIONS" : "WORKFORCE");

  const filteredFarms = useMemo(() => {
    return farms.filter((f) => {
      const matchStatus = statusFilter === "ALL" || f.status === statusFilter;
      const matchSearch =
        !search ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.location.toLowerCase().includes(search.toLowerCase()) ||
        f.adminName.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [farms, statusFilter, search]);

  const totalAcreage = farms
    .reduce((acc, f) => acc + Number(f.totalArea || 0), 0)
    .toFixed(1);

  const handleReviewException = async (
    exceptionId: string,
    decision: "APPROVED" | "REJECTED"
  ) => {
    setProcessingId(exceptionId);
    try {
      const res = await fetch(`/api/attendance-exceptions/${exceptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Approval request failed.");
      }

      toast.success(
        decision === "APPROVED"
          ? "Geofence exception authorized."
          : "Geofence exception rejected."
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to process decision.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReviewLocation = async (
    requestId: string,
    decision: "APPROVED" | "REJECTED"
  ) => {
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/location-change-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Location review failed.");
      }

      toast.success(`Location request ${decision.toLowerCase()}.`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to process location decision.");
    } finally {
      setProcessingId(null);
    }
  };

  const viewSelfie = async (key: string, officer: string) => {
    setLightboxSelfie({ url: null, officer, loading: true });
    try {
      const res = await fetch(`/api/attendance/selfie?key=${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error("Could not load selfie photo.");
      const data = await res.json();
      setLightboxSelfie({ url: data.url, officer, loading: false });
    } catch {
      toast.error("Could not fetch selfie verification.");
      setLightboxSelfie(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* ── 1. EXECUTIVE COMMAND HEADER & AUTHORITATIVE ACTIONS BAR ── */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>
              {isSuperAdmin
                ? "GLOBAL EXECUTIVE COMMAND &bull; SUPER ADMIN"
                : isFarmAdmin
                ? "ESTATE OPERATIONS COCKPIT &bull; FARM ADMIN"
                : "CENTRAL AGRONOMY CONSOLE"}
            </span>
          </div>
          <h1 className="page-title">
            {isSuperAdmin
              ? "Estate Operations & Workforce Command"
              : "Farm Operations Cockpit"}
          </h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {isSuperAdmin
              ? "Multi-estate operational telemetry, live field presence, geofence compliance, and executive authorizations."
              : "Today's field muster, shift execution progress, and estate operational signals."}
          </p>
        </div>

        {/* Authoritative Command Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Approvals Button with dynamic notification badge */}
          {["SUPER_ADMIN", "FARM_ADMIN"].includes(role) && (
            <Link
              href="/admin/approvals"
              className={`btn ${totalPendingApprovals > 0 ? "btn-danger" : "btn-secondary"}`}
              style={{ position: "relative" }}
            >
              <Icons.Shield size={15} />
              <span>Approvals</span>
              {totalPendingApprovals > 0 && (
                <span
                  style={{
                    backgroundColor: "var(--red)",
                    color: "#fff",
                    borderRadius: "10px",
                    padding: "2px 7px",
                    fontSize: "11px",
                    fontWeight: 700,
                    marginLeft: 4,
                  }}
                >
                  {totalPendingApprovals}
                </span>
              )}
            </Link>
          )}

          {/* Workforce & Live Attendance Roster */}
          {["SUPER_ADMIN", "FARM_ADMIN"].includes(role) && (
            <Link href="/admin/attendance" className="btn btn-green">
              <Icons.Users size={15} />
              <span>Live Workforce ({workforceSummary.onDutyCount} Active)</span>
            </Link>
          )}

          {/* Provision New Estate */}
          {isSuperAdmin && (
            <Link href="/farms/new" className="btn btn-primary">
              <Icons.Plus size={15} />
              <span>Provision Estate</span>
            </Link>
          )}

          {/* User Access Management */}
          {isSuperAdmin && (
            <Link href="/admin/users" className="btn btn-secondary">
              <Icons.Key size={15} />
              <span>Team &amp; Access</span>
            </Link>
          )}

          {/* System Audit Trail */}
          {["SUPER_ADMIN", "FARM_ADMIN"].includes(role) && (
            <Link href="/admin/audit" className="btn btn-secondary">
              <Icons.Activity size={15} />
              <span>Audit Trail</span>
            </Link>
          )}

          <Link href="/reports/daily" className="btn btn-secondary">
            <Icons.FileText size={15} />
            <span>Daily Report</span>
          </Link>
        </div>
      </div>
      {/* ── 2. EXECUTIVE PULSE KPI DECK (Modern Floating Cards) ── */}
      <div className="metric-summary-row">
        <div className="metric-summary-item">
          <span className="metric-label">Managed Estates</span>
          <div className="metric-value">{metrics.totalFarms}</div>
          <div className="metric-sub">{metrics.activeFarms} ACTIVE &bull; {metrics.setupFarms} IN SETUP</div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Live Field Presence</span>
          <div className="metric-value" style={{ color: "var(--green)" }}>{workforceSummary.onDutyCount}</div>
          <div className="metric-sub" style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="telemetry-live-dot" /> {workforceSummary.complianceRate}% GEOFENCE COMPLIANT
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Authoritative Action Items</span>
          <div
            className="metric-value"
            style={{ color: actionItemsCount > 0 ? "var(--amber)" : "var(--muted)" }}
          >
            {actionItemsCount}
          </div>
          <div className="metric-sub">
            {totalPendingApprovals} APPROVALS &bull; {activeIncidents.length} HAZARDS
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Cultivable Land</span>
          <div className="metric-value">{totalAcreage} <span style={{ fontSize: 16 }}>ac</span></div>
          <div className="metric-sub">{metrics.totalPlots} LAND PLOTS MANAGED</div>
        </div>
      </div>

      {/* ── 3. SEGMENTED COMMAND CONSOLE NAVIGATION ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div className="tabs-nav" style={{ padding: 6, gap: 6 }}>
          <button
            type="button"
            className={`tab-btn ${activeConsoleTab === "ACTIONS" ? "active" : ""}`}
            onClick={() => setActiveConsoleTab("ACTIONS")}
          >
            <Icons.AlertTriangle size={15} />
            <span>Action Center</span>
            {actionItemsCount > 0 && (
              <span className="badge badge-amber" style={{ fontSize: 11, padding: "2px 8px" }}>
                {actionItemsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`tab-btn ${activeConsoleTab === "WORKFORCE" ? "active" : ""}`}
            onClick={() => setActiveConsoleTab("WORKFORCE")}
          >
            <Icons.Users size={15} />
            <span>Workforce Presence</span>
            <span className="badge badge-green" style={{ fontSize: 11, padding: "2px 8px" }}>
              {workforceSummary.onDutyCount} On Duty
            </span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeConsoleTab === "ESTATES" ? "active" : ""}`}
            onClick={() => setActiveConsoleTab("ESTATES")}
          >
            <Icons.Farm size={15} />
            <span>Estate Portfolio</span>
            <span className="badge badge-muted" style={{ fontSize: 11, padding: "2px 8px" }}>
              {farms.length}
            </span>
          </button>
        </div>

        {activeConsoleTab === "ESTATES" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="tabs-nav" style={{ padding: 4, gap: 4 }}>
              <button
                type="button"
                className={`tab-btn ${statusFilter === "ALL" ? "active" : ""}`}
                onClick={() => setStatusFilter("ALL")}
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                All ({farms.length})
              </button>
              <button
                type="button"
                className={`tab-btn ${statusFilter === "ACTIVE" ? "active" : ""}`}
                onClick={() => setStatusFilter("ACTIVE")}
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                Active ({metrics.activeFarms})
              </button>
              <button
                type="button"
                className={`tab-btn ${statusFilter === "SETUP" ? "active" : ""}`}
                onClick={() => setStatusFilter("SETUP")}
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                Setup ({metrics.setupFarms})
              </button>
            </div>

            <div style={{ position: "relative", width: 220 }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search estates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 30, fontSize: 13, height: 38, borderRadius: "var(--radius-pill)" }}
              />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
                <Icons.Search size={14} />
              </span>
            </div>
          </div>
        )}

        {activeConsoleTab === "WORKFORCE" && (
          <Link
            href="/admin/attendance"
            className="btn btn-secondary"
            style={{ fontSize: 13, padding: "7px 14px", borderRadius: "var(--radius-pill)" }}
          >
            <Icons.Users size={14} />
            <span>Open Full Attendance Muster Roll &rarr;</span>
          </Link>
        )}
      </div>

      {/* ── 4. CONSOLE VIEW 1: ACTION CENTER ── */}
      {activeConsoleTab === "ACTIONS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {actionItemsCount === 0 ? (
            <EmptyState
              title="All Operations Nominal"
              description="No unresolved geofence breaches, boundary modification requests, or active crop hazards require executive intervention."
            />
          ) : (
            <>
              {/* Geofence Breach Exceptions */}
              {pendingExceptions.length > 0 && (
                <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="eyebrow" style={{ color: "var(--amber)" }}>
                    <span className="eyebrow-dot" style={{ backgroundColor: "var(--amber)" }} />
                    <span>OUTSIDE-GEOFENCE ATTENDANCE EXCEPTIONS ({pendingExceptions.length})</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
                    {pendingExceptions.map((ex) => (
                      <div
                        key={ex.id}
                        className="compact-card"
                        style={{
                          padding: 22,
                          gap: 16,
                          borderRadius: "var(--radius-md)",
                          boxShadow: "var(--shadow-card)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 16 }}>
                              {ex.officerName}
                            </div>
                            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                              {ex.farmName} &bull; {ex.time ? formatTime(ex.time) : "Today"}
                            </div>
                          </div>
                          <span className="badge badge-amber">
                            <Icons.AlertTriangle size={12} /> +{ex.distanceMeters}m Breach
                          </span>
                        </div>

                        <div
                          style={{
                            backgroundColor: "var(--amber-light)",
                            borderRadius: "var(--radius-sm)",
                            padding: "12px 14px",
                            fontSize: 13,
                            color: "var(--ink)",
                            lineHeight: 1.4,
                          }}
                        >
                          <strong style={{ fontSize: 11, textTransform: "uppercase", color: "var(--amber)", display: "block", marginBottom: 4 }}>
                            Officer Reason Declared:
                          </strong>
                          &ldquo;{ex.reason}&rdquo;
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={processingId === ex.id}
                            onClick={() => handleReviewException(ex.id, "REJECTED")}
                            style={{ borderRadius: "var(--radius-sm)", fontSize: 12, padding: "6px 14px" }}
                          >
                            <Icons.X size={13} />
                            <span>Reject</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-green"
                            disabled={processingId === ex.id}
                            onClick={() => handleReviewException(ex.id, "APPROVED")}
                            style={{ borderRadius: "var(--radius-sm)", fontSize: 12, padding: "6px 14px" }}
                          >
                            <Icons.Check size={13} />
                            <span>Authorize Shift</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Farm Perimeter Change Requests */}
              {pendingLocations.length > 0 && (
                <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="eyebrow" style={{ color: "var(--blue)" }}>
                    <span className="eyebrow-dot" style={{ backgroundColor: "var(--blue)" }} />
                    <span>PERIMETER &amp; BOUNDARY RE-CALIBRATION REQUESTS ({pendingLocations.length})</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
                    {pendingLocations.map((loc) => (
                      <div
                        key={loc.id}
                        className="compact-card"
                        style={{
                          padding: 22,
                          gap: 16,
                          borderRadius: "var(--radius-md)",
                          boxShadow: "var(--shadow-card)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 16 }}>
                              {loc.farmName}
                            </div>
                            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                              {loc.farmLocation} &bull; Requested on {loc.date}
                            </div>
                          </div>
                          <span className="badge badge-blue">
                            <Icons.MapPin size={12} /> Boundary Change
                          </span>
                        </div>

                        <div
                          style={{
                            backgroundColor: "var(--blue-light)",
                            borderRadius: "var(--radius-sm)",
                            padding: "12px 14px",
                            fontSize: 13,
                            color: "var(--ink)",
                          }}
                        >
                          <div>Proposed GPS: <code>{loc.proposedLat}, {loc.proposedLng}</code></div>
                          <div className="muted" style={{ marginTop: 4 }}>Reason: &ldquo;{loc.reason}&rdquo;</div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={processingId === loc.id}
                            onClick={() => handleReviewLocation(loc.id, "REJECTED")}
                            style={{ borderRadius: "var(--radius-sm)", fontSize: 12, padding: "6px 14px" }}
                          >
                            <Icons.X size={13} />
                            <span>Reject</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-green"
                            disabled={processingId === loc.id}
                            onClick={() => handleReviewLocation(loc.id, "APPROVED")}
                            style={{ borderRadius: "var(--radius-sm)", fontSize: 12, padding: "6px 14px" }}
                          >
                            <Icons.Check size={13} />
                            <span>Update Perimeter</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Active Agricultural Incidents with Photos */}
              {activeIncidents.length > 0 && (
                <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="eyebrow" style={{ color: "var(--red)" }}>
                    <span className="eyebrow-dot" style={{ backgroundColor: "var(--red)" }} />
                    <span>OPERATIONAL HAZARDS &amp; FIELD INCIDENTS ({activeIncidents.length})</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
                    {activeIncidents.map((inc) => (
                      <div
                        key={inc.id}
                        className="compact-card hover-glow"
                        style={{
                          padding: 18,
                          gap: 14,
                          borderRadius: "var(--radius-md)",
                          boxShadow: "var(--shadow-card)",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedIncident(inc)}
                      >
                        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                          <div
                            style={{
                              width: 96,
                              height: 96,
                              minWidth: 96,
                              borderRadius: "var(--radius-sm)",
                              overflow: "hidden",
                              backgroundColor: "var(--stone)",
                              position: "relative",
                            }}
                          >
                            {inc.imageUrl ? (
                              <img
                                src={inc.imageUrl}
                                alt={inc.type}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 4,
                                  color: "var(--muted)",
                                  fontSize: 10,
                                }}
                              >
                                <Icons.AlertTriangle size={24} style={{ color: inc.severity === "CRITICAL" ? "var(--red)" : "var(--amber)" }} />
                                <span>No Photo</span>
                              </div>
                            )}
                            {inc.imageUrl && (
                              <span
                                style={{
                                  position: "absolute",
                                  bottom: 4,
                                  right: 4,
                                  backgroundColor: "rgba(0,0,0,0.7)",
                                  color: "#fff",
                                  borderRadius: "var(--radius-pill)",
                                  padding: "2px 6px",
                                  fontSize: 9,
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                              >
                                <Icons.Camera size={10} /> Photo
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {inc.type}
                              </span>
                              <span
                                className={`badge ${
                                  inc.severity === "CRITICAL"
                                    ? "badge-danger"
                                    : inc.severity === "HIGH"
                                    ? "badge-amber"
                                    : "badge-blue"
                                }`}
                              >
                                {inc.severity}
                              </span>
                            </div>

                            <div className="muted" style={{ fontSize: 12 }}>
                              {inc.farmName} {inc.plotName ? `• ${inc.plotName}` : ""}
                            </div>

                            <p
                              style={{
                                margin: 0,
                                fontSize: 13,
                                color: "var(--ink)",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                lineHeight: 1.4,
                              }}
                            >
                              {inc.description}
                            </p>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                              <span>Reported {inc.date}</span>
                              {inc.impactPercent && (
                                <span style={{ color: "var(--amber)", fontWeight: 600 }}>
                                  Impact: {inc.impactPercent}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Poor Crop Health Alerts */}
              {poorHealthAlerts.length > 0 && (
                <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="eyebrow" style={{ color: "var(--red)" }}>
                    <span className="eyebrow-dot" style={{ backgroundColor: "var(--red)" }} />
                    <span>CROP HEALTH DISTRESS WARNINGS ({poorHealthAlerts.length})</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
                    {poorHealthAlerts.map((a) => (
                      <Link
                        key={a.id}
                        href={`/farms/${a.farmId}`}
                        className="compact-card hover-glow"
                        style={{
                          padding: 18,
                          gap: 12,
                          borderRadius: "var(--radius-md)",
                          boxShadow: "var(--shadow-card)",
                          textDecoration: "none",
                        }}
                      >
                        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                          {a.imageUrl && (
                            <div
                              style={{
                                width: 96,
                                height: 96,
                                minWidth: 96,
                                borderRadius: "var(--radius-sm)",
                                overflow: "hidden",
                                backgroundColor: "var(--stone)",
                              }}
                            >
                              <img
                                src={a.imageUrl}
                                alt={a.cropName}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </div>
                          )}

                          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15 }}>
                                {a.farmName} &bull; {a.cropName}
                              </span>
                              <span className="badge badge-danger">POOR HEALTH</span>
                            </div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              Plot: {a.plotName} &bull; Stage: {a.stage} &bull; Impact: {a.impactPercent ? `${a.impactPercent}%` : "Unspecified"}
                            </div>
                            {a.remarks && (
                              <div style={{ fontSize: 12, color: "var(--ink)", fontStyle: "italic", lineHeight: 1.4 }}>
                                &ldquo;{a.remarks}&rdquo;
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 5. CONSOLE VIEW 2: WORKFORCE PRESENCE ── */}
      {activeConsoleTab === "WORKFORCE" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Workforce Telemetry Breakdown Ribbon */}
          <div className="metric-summary-row">
            <div className="metric-summary-item">
              <span className="metric-label">Staff Scheduled</span>
              <div className="metric-value">{workforceSummary.totalOfficers}</div>
              <div className="metric-sub">{workforceSummary.totalOfficers - workforceSummary.notClockedInCount} CLOCKED IN TODAY</div>
            </div>

            <div className="metric-summary-item">
              <span className="metric-label">Active On Duty</span>
              <div className="metric-value" style={{ color: "var(--green)" }}>{workforceSummary.onDutyCount}</div>
              <div className="metric-sub" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span className="telemetry-live-dot" /> LIVE IN FIELD
              </div>
            </div>

            <div className="metric-summary-item">
              <span className="metric-label">Geofence Compliance</span>
              <div className="metric-value" style={{ color: workforceSummary.complianceRate >= 90 ? "var(--green)" : "var(--amber)" }}>
                {workforceSummary.complianceRate}%
              </div>
              <div className="metric-sub">{workforceSummary.withinGeofenceCount} VERIFIED ON-SITE</div>
            </div>

            <div className="metric-summary-item">
              <span className="metric-label">Distance Exceptions</span>
              <div className="metric-value" style={{ color: workforceSummary.exceptionPendingCount > 0 ? "var(--amber)" : "var(--muted)" }}>
                {workforceSummary.exceptionPendingCount}
              </div>
              <div className="metric-sub">{workforceSummary.exceptionPendingCount > 0 ? "NEEDS AUTHORIZATION" : "ZERO UNRESOLVED"}</div>
            </div>

            <div className="metric-summary-item">
              <span className="metric-label">Shifts Completed</span>
              <div className="metric-value">{workforceSummary.completedCount}</div>
              <div className="metric-sub">{workforceSummary.notClockedInCount} NOT YET CLOCKED IN</div>
            </div>
          </div>

          {/* Officer Presence Cards */}
          {rosterPreview.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="eyebrow" style={{ color: "var(--green)" }}>
                  <span className="eyebrow-dot" style={{ backgroundColor: "var(--green)" }} />
                  <span>FIELD ROSTER PRESENCE &amp; RECENT CLOCK-INS</span>
                </div>
                <span className="muted" style={{ fontSize: 12 }}>
                  Verified via hardware GPS and photo evidence
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
                {rosterPreview.map((item) => {
                  const isPending = item.status === "EXCEPTION_PENDING";
                  const isOnDuty = item.status === "OPEN" || item.status === "EXCEPTION_APPROVED";

                  return (
                    <div
                      key={item.attendanceId}
                      className="compact-card"
                      style={{
                        padding: 20,
                        gap: 14,
                        borderRadius: "var(--radius-md)",
                        boxShadow: "var(--shadow-card)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              backgroundColor: isOnDuty ? "var(--green-light)" : "var(--stone)",
                              color: isOnDuty ? "var(--green-dark)" : "var(--muted)",
                              fontWeight: 700,
                              fontSize: 15,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {item.officerName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15 }}>
                              {item.officerName}
                            </div>
                            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                              {item.farmName} &bull; Clock-in: {formatTime(item.startAt)}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isPending ? (
                            <span className="badge badge-amber">EXCEPTION PENDING</span>
                          ) : isOnDuty ? (
                            <span className="badge badge-green">ON DUTY</span>
                          ) : (
                            <span className="badge badge-blue">COMPLETED</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                        <div>
                          {item.withinGeofence ? (
                            <span style={{ color: "var(--green)", display: "flex", alignItems: "center", gap: 5, fontWeight: 500 }}>
                              <Icons.Check size={14} /> On-Site ({item.distanceMeters ?? 0}m)
                            </span>
                          ) : (
                            <span style={{ color: "var(--amber)", display: "flex", alignItems: "center", gap: 5, fontWeight: 500 }}>
                              <Icons.AlertTriangle size={14} /> Outside Geofence (+{item.distanceMeters ?? 0}m)
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          {item.startSelfieKey && (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              style={{ padding: "4px 10px", fontSize: 12, borderRadius: "var(--radius-pill)" }}
                              onClick={() => viewSelfie(item.startSelfieKey!, item.officerName)}
                              title="Inspect Selfie Proof"
                            >
                              <Icons.Camera size={13} />
                              <span>Selfie</span>
                            </button>
                          )}

                          {isPending && item.exceptionId && ["SUPER_ADMIN", "FARM_ADMIN"].includes(role) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-green"
                              style={{ padding: "4px 10px", fontSize: 12, borderRadius: "var(--radius-pill)" }}
                              disabled={processingId === item.exceptionId}
                              onClick={() => handleReviewException(item.exceptionId!, "APPROVED")}
                            >
                              <Icons.Check size={13} />
                              <span>Approve</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No Active Check-Ins"
              description="No officers have clocked in today yet. When field officers start shifts at their assigned estates, their presence and compliance metrics will stream here in real-time."
            />
          )}
        </div>
      )}

      {/* ── 6. CONSOLE VIEW 3: ESTATE PORTFOLIO ── */}
      {activeConsoleTab === "ESTATES" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {filteredFarms.length === 0 ? (
            <EmptyState
              title="No Estates Match"
              description="No managed farms found matching your search or status filter."
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 18 }}>
              {filteredFarms.map((f) => {
                const activeCrops = f.plots.flatMap((p) => p.cropCycles).filter((c) => c.status === "ACTIVE");
                const taskProgress = f.todayTasksTotal > 0
                  ? Math.round((f.todayTasksCompleted / f.todayTasksTotal) * 100)
                  : 0;

                return (
                  <div
                    key={f.id}
                    className="compact-card hover-glow"
                    style={{
                      padding: 24,
                      gap: 16,
                      borderRadius: "var(--radius-md)",
                      boxShadow: "var(--shadow-card)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div>
                          <Link
                            href={`/farms/${f.id}`}
                            style={{
                              fontSize: 18,
                              fontWeight: 600,
                              color: "var(--ink)",
                              textDecoration: "none",
                            }}
                          >
                            {f.name}
                          </Link>
                          <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
                            {f.location} &bull; Admin: {f.adminName}
                          </div>
                        </div>
                        <StatusBadge status={f.status} />
                      </div>

                      {/* Cultivated Area Progress Bar */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                          <span className="muted">Cultivated Area</span>
                          <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                            {f.cultivableArea} of {f.totalArea} Acres
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            backgroundColor: "var(--stone)",
                            borderRadius: "var(--radius-pill)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(100, Math.round((Number(f.cultivableArea) / Math.max(1, Number(f.totalArea))) * 100))}%`,
                              backgroundColor: "var(--green)",
                              borderRadius: "var(--radius-pill)",
                            }}
                          />
                        </div>
                      </div>

                      {/* Estate Metadata Badges */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                        <span className="badge badge-muted">
                          {f.plots.length} Plots
                        </span>
                        {activeCrops.length > 0 ? (
                          <span className="badge badge-green">
                            {activeCrops.length} Active Crop Cycles
                          </span>
                        ) : (
                          <span className="badge badge-muted">
                            No Active Crops
                          </span>
                        )}
                        {f.todayTasksTotal > 0 && (
                          <span className="badge badge-blue">
                            Tasks: {f.todayTasksCompleted}/{f.todayTasksTotal} ({taskProgress}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid var(--line)",
                        paddingTop: 14,
                        marginTop: 4,
                      }}
                    >
                      <Link
                        href={`/admin/attendance?farmId=${f.id}`}
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: 12, padding: "5px 12px", borderRadius: "var(--radius-pill)" }}
                      >
                        <Icons.Users size={13} />
                        <span>Roster</span>
                      </Link>

                      <Link
                        href={`/farms/${f.id}`}
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: 12, padding: "5px 14px", borderRadius: "var(--radius-pill)" }}
                      >
                        <span>Manage Estate &rarr;</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 6. SELFIE LIGHTBOX MODAL ── */}
      {lightboxSelfie && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setLightboxSelfie(null)}
        >
          <div
            className="compact-card"
            style={{
              maxWidth: 400,
              width: "100%",
              padding: 20,
              gap: 14,
              backgroundColor: "var(--canvas)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{lightboxSelfie.officer} &bull; Verification Selfie</h3>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setLightboxSelfie(null)}
              >
                <Icons.X size={14} />
              </button>
            </div>

            <div
              style={{
                width: "100%",
                height: 300,
                backgroundColor: "var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "1px solid var(--line)",
              }}
            >
              {lightboxSelfie.loading ? (
                <div className="muted">Retrieving photo…</div>
              ) : lightboxSelfie.url ? (
                <img
                  src={lightboxSelfie.url}
                  alt="Officer Selfie"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div className="error">Photo asset not found.</div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="badge badge-green">
                <Icons.CheckCircle size={12} /> Verified S3 Asset
              </span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setLightboxSelfie(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. INCIDENT EVIDENCE LIGHTBOX MODAL ── */}
      {selectedIncident && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setSelectedIncident(null)}
        >
          <div
            className="compact-card"
            style={{
              maxWidth: 540,
              width: "100%",
              padding: 24,
              gap: 16,
              backgroundColor: "var(--canvas)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="eyebrow" style={{ color: "var(--red)" }}>
                  <span className="eyebrow-dot" style={{ backgroundColor: "var(--red)" }} />
                  <span>INCIDENT EVIDENCE &bull; {selectedIncident.severity}</span>
                </div>
                <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
                  {selectedIncident.type}
                </h3>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {selectedIncident.farmName} {selectedIncident.plotName ? `• Plot: ${selectedIncident.plotName}` : ""}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setSelectedIncident(null)}
              >
                <Icons.X size={15} />
              </button>
            </div>

            {selectedIncident.imageUrl && (
              <div
                style={{
                  width: "100%",
                  maxHeight: 320,
                  borderRadius: "var(--radius-xs)",
                  overflow: "hidden",
                  border: "1px solid var(--line)",
                  backgroundColor: "#000",
                }}
              >
                <img
                  src={selectedIncident.imageUrl}
                  alt={selectedIncident.type}
                  style={{ width: "100%", maxHeight: 320, objectFit: "contain" }}
                />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <div>
                <span className="label" style={{ fontSize: 11 }}>INCIDENT DESCRIPTION</span>
                <p style={{ margin: "4px 0 0", color: "var(--ink)", lineHeight: 1.5 }}>
                  {selectedIncident.description}
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  padding: 12,
                  backgroundColor: "var(--canvas)",
                  border: "1px solid var(--line)",
                }}
              >
                <div>
                  <span className="label" style={{ fontSize: 10 }}>SEVERITY</span>
                  <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                    {selectedIncident.severity}
                  </div>
                </div>
                <div>
                  <span className="label" style={{ fontSize: 10 }}>ESTIMATED IMPACT</span>
                  <div style={{ fontWeight: 600, color: "var(--amber)", marginTop: 2 }}>
                    {selectedIncident.impactPercent ? `${selectedIncident.impactPercent}% Yield Variance` : "Not specified"}
                  </div>
                </div>
                <div>
                  <span className="label" style={{ fontSize: 10 }}>STATUS</span>
                  <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                    {selectedIncident.status}
                  </div>
                </div>
                <div>
                  <span className="label" style={{ fontSize: 10 }}>REPORT DATE</span>
                  <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                    {selectedIncident.date}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid var(--line)",
                paddingTop: 14,
              }}
            >
              <Link
                href={`/farms/${selectedIncident.farmId}`}
                className="btn btn-sm btn-primary"
                onClick={() => setSelectedIncident(null)}
              >
                <span>View Estate &amp; Mitigation &rarr;</span>
              </Link>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setSelectedIncident(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
