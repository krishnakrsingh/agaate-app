"use client";
import { useEffect, useState, useMemo, FormEvent } from "react";
import { Icons } from "./icons";
import { RoleBadge, StatusBadge } from "./ui/badge";
import { EmptyState } from "./ui/empty-state";
import { CardSkeleton } from "./ui/skeleton";
import { useToast } from "./ui/toast";
import { formatTime } from "@/lib/business";

type Estate = { id: string; name: string; location: string };

type RosterItem = {
  officerId: string;
  officerName: string;
  officerEmail: string;
  farmId: string;
  farmName: string;
  farmLocation: string;
  attendanceId: string | null;
  status: string;
  hasStarted: boolean;
  hasEnded: boolean;
  startAt: string | null;
  endAt: string | null;
  startLatitude: number | null;
  startLongitude: number | null;
  distanceMeters: number | null;
  withinGeofence: boolean;
  startSelfieKey: string | null;
  endSelfieKey: string | null;
  exceptionReason: string | null;
  exceptionId: string | null;
  exceptionStatus: string | null;
  durationMinutes: number | null;
};

type Summary = {
  totalOfficers: number;
  onDutyCount: number;
  completedCount: number;
  exceptionPendingCount: number;
  notClockedInCount: number;
  withinGeofenceCount: number;
  complianceRate: number;
};

export function WorkforceAttendanceConsole({
  initialRole = "SUPER_ADMIN",
}: {
  initialRole?: string;
}) {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [selectedFarmId, setSelectedFarmId] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"ALL" | "ON_DUTY" | "EXCEPTIONS" | "COMPLETED" | "ABSENT">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [requiresFilter, setRequiresFilter] = useState(false);
  const [estateCount, setEstateCount] = useState(0);
  const [estateQuery, setEstateQuery] = useState("");
  const [rosterPage, setRosterPage] = useState(1);
  const ROSTER_PAGE_SIZE = 20;
  const [summary, setSummary] = useState<Summary>({
    totalOfficers: 0,
    onDutyCount: 0,
    completedCount: 0,
    exceptionPendingCount: 0,
    notClockedInCount: 0,
    withinGeofenceCount: 0,
    complianceRate: 100,
  });

  // Lightbox selfie modal
  const [viewingSelfie, setViewingSelfie] = useState<{
    url: string | null;
    title: string;
    officer: string;
    time: string;
    loading: boolean;
  } | null>(null);

  // Exception action pending ID
  const [processingExceptionId, setProcessingExceptionId] = useState<string | null>(null);
  const [showHireModal, setShowHireModal] = useState(false);
  const [hirePending, setHirePending] = useState(false);

  const handleHireOfficer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHirePending(true);
    const form = new FormData(e.currentTarget);
    const farmId = String(form.get("farmId"));

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          role: "FARM_OFFICER",
          farmIds: [farmId],
          managesFarmIds: [],
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || "Failed to employ farm officer.");
      }

      toast.success("Farm Manager employed! Login credentials created.");
      setShowHireModal(false);
      void fetchRoster();
    } catch (err: any) {
      toast.error(err.message || "Could not hire officer.");
    } finally {
      setHirePending(false);
    }
  };

  const fetchRoster = async () => {
    setLoading(true);
    setError("");
    try {
      const url = new URL("/api/attendance/roster", window.location.origin);
      url.searchParams.set("date", selectedDate);
      if (selectedFarmId !== "ALL") {
        url.searchParams.set("farmId", selectedFarmId);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load workforce roster.");
      }

      const data = await res.json();
      setRoster(data.roster || []);
      setEstates(data.estates || []);
      setRequiresFilter(!!data.requiresEstateFilter);
      setEstateCount(data.estateCount || 0);
      setRosterPage(1);
      setSummary(
        data.summary || {
          totalOfficers: 0,
          onDutyCount: 0,
          completedCount: 0,
          exceptionPendingCount: 0,
          notClockedInCount: 0,
          withinGeofenceCount: 0,
          complianceRate: 100,
        }
      );
    } catch (err: any) {
      setError(err.message || "Network error loading workforce telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRoster();
  }, [selectedDate, selectedFarmId]);

  const handleReviewException = async (exceptionId: string, status: "APPROVED" | "REJECTED") => {
    setProcessingExceptionId(exceptionId);
    try {
      const res = await fetch(`/api/attendance-exceptions/${exceptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to record decision.`);
      }

      toast.success(
        status === "APPROVED"
          ? "Geofence exception authorized."
          : "Geofence exception rejected."
      );
      void fetchRoster();
    } catch (err: any) {
      toast.error(err.message || "Failed to process approval.");
    } finally {
      setProcessingExceptionId(null);
    }
  };

  const openSelfieLightbox = async (
    attendanceId: string,
    title: string,
    officer: string,
    time: string,
    slot: "start" | "end" = "start"
  ) => {
    setViewingSelfie({ url: null, title, officer, time, loading: true });
    try {
      const res = await fetch(`/api/attendance/selfie?attendanceId=${encodeURIComponent(attendanceId)}&slot=${slot}`);
      if (!res.ok) throw new Error("Could not retrieve secure selfie photo.");
      const data = await res.json();
      setViewingSelfie({ url: data.url, title, officer, time, loading: false });
    } catch {
      toast.error("Could not load selfie proof.");
      setViewingSelfie(null);
    }
  };

  const filteredRoster = useMemo(() => {
    return roster.filter((item) => {
      // Search filter
      const matchSearch =
        !search ||
        item.officerName.toLowerCase().includes(search.toLowerCase()) ||
        item.officerEmail.toLowerCase().includes(search.toLowerCase()) ||
        item.farmName.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      // Tab filter
      if (activeTab === "ALL") return true;
      if (activeTab === "ON_DUTY")
        return item.status === "OPEN" || item.status === "EXCEPTION_APPROVED";
      if (activeTab === "EXCEPTIONS")
        return item.status === "EXCEPTION_PENDING" || !item.withinGeofence;
      if (activeTab === "COMPLETED")
        return item.status === "COMPLETED" || item.hasEnded;
      if (activeTab === "ABSENT") return item.status === "NOT_CLOCKED_IN";

      return true;
    });
  }, [roster, search, activeTab]);

  const rosterTotalPages = Math.max(1, Math.ceil(filteredRoster.length / ROSTER_PAGE_SIZE));
  const safeRosterPage = Math.min(rosterPage, rosterTotalPages);
  const pagedRoster = filteredRoster.slice(
    (safeRosterPage - 1) * ROSTER_PAGE_SIZE,
    safeRosterPage * ROSTER_PAGE_SIZE
  );
  const estateMatches =
    estateQuery.trim().length === 0
      ? estates.slice(0, 50)
      : estates
          .filter((e) => `${e.name} ${e.location}`.toLowerCase().includes(estateQuery.trim().toLowerCase()))
          .slice(0, 50);

  const stepDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  const formatDuration = (mins: number | null) => {
    if (mins === null) return "--";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* FILTER & DATE CONTROLS BAR */}
      <div
        className="compact-card"
        style={{
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {/* Left: Date Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div className="btn-group" style={{ display: "flex" }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => stepDate(-1)}
              title="Previous Day"
            >
              <Icons.ArrowLeft size={14} />
            </button>
            <button
              type="button"
              className={`btn btn-sm ${isToday ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            >
              Today
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => stepDate(1)}
              title="Next Day"
            >
              <Icons.ArrowRight size={14} />
            </button>
          </div>

          <input
            type="date"
            className="input-field"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: 140, padding: "6px 10px", fontSize: 13 }}
          />

          {isToday && (
            <span className="badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span className="telemetry-live-dot" /> LIVE ROSTER
            </span>
          )}
        </div>

        {/* Right: Estate Filter & Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="label" style={{ fontSize: 11, textTransform: "uppercase" }}>Estate:</span>
            <div style={{ position: "relative" }}>
              <input
                className="input-field"
                value={selectedFarmId === "ALL" ? estateQuery : estates.find((e) => e.id === selectedFarmId)?.name || estateQuery}
                onChange={(e) => {
                  setEstateQuery(e.target.value);
                  if (selectedFarmId !== "ALL") setSelectedFarmId("ALL");
                }}
                placeholder={initialRole === "SUPER_ADMIN" ? "Type estate name to scope…" : "All Managed Estates"}
                style={{ width: 200, padding: "6px 10px", fontSize: 13 }}
              />
              {(estateQuery.trim() || selectedFarmId !== "ALL") && estateMatches.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, minWidth: 240, background: "var(--canvas)", border: "1px solid var(--line)", borderRadius: 8, zIndex: 30, maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFarmId("ALL");
                      setEstateQuery("");
                    }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: "none", border: "none", borderBottom: "1px solid var(--stone)", cursor: "pointer", fontSize: 12 }}
                  >
                    All in scope (may be capped)
                  </button>
                  {estateMatches.map((est) => (
                    <button
                      key={est.id}
                      type="button"
                      onClick={() => {
                        setSelectedFarmId(est.id);
                        setEstateQuery("");
                      }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: selectedFarmId === est.id ? "var(--stone)" : "none", border: "none", borderBottom: "1px solid var(--stone)", cursor: "pointer", fontSize: 12 }}
                    >
                      <strong>{est.name}</strong>
                      <span className="muted"> — {est.location}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={fetchRoster}
            title="Refresh Roster Telemetry"
          >
            <Icons.Refresh size={14} />
            <span>Sync</span>
          </button>

          {(initialRole === "FARM_ADMIN" || initialRole === "SUPER_ADMIN") && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setShowHireModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Icons.Plus size={14} />
              <span>Hire Farm Manager</span>
            </button>
          )}
        </div>
      </div>

      {requiresFilter && (
        <div className="alert alert-danger" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icons.AlertTriangle size={16} />
          <span>
            Platform scope is {estateCount.toLocaleString()} estates — pick one estate above to load its roster. Broad loads are disabled at scale.
          </span>
        </div>
      )}

      {/* OPERATIONAL TELEMETRY METRIC SUMMARY */}
      <section>
        <div className="label" style={{ marginBottom: 8, color: "var(--ink)" }}>
          FIELD WORKFORCE ATTENDANCE TELEMETRY
        </div>
        <div className="metric-summary-row">
          <div className="metric-summary-item">
            <span className="metric-label">Assigned Staff</span>
            <div className="metric-value">{summary.totalOfficers}</div>
            <div className="metric-sub">
              {summary.totalOfficers - summary.notClockedInCount} REPORTED ({Math.round(((summary.totalOfficers - summary.notClockedInCount) / (summary.totalOfficers || 1)) * 100)}%)
            </div>
          </div>

          <div className="metric-summary-item">
            <span className="metric-label">Active On Duty</span>
            <div className="metric-value" style={{ color: "var(--green)" }}>
              {summary.onDutyCount}
            </div>
            <div className="metric-sub">CURRENTLY ON FIELD</div>
          </div>

          <div className="metric-summary-item">
            <span className="metric-label">Geofence Compliance</span>
            <div className="metric-value" style={{ color: summary.complianceRate >= 90 ? "var(--green)" : "var(--amber)" }}>
              {summary.complianceRate}%
            </div>
            <div className="metric-sub">
              {summary.withinGeofenceCount} VERIFIED ON-SITE
            </div>
          </div>

          <div className="metric-summary-item">
            <span className="metric-label">Exceptions Pending</span>
            <div
              className="metric-value"
              style={{ color: summary.exceptionPendingCount > 0 ? "var(--amber)" : "var(--muted)" }}
            >
              {summary.exceptionPendingCount}
            </div>
            <div className="metric-sub">AWAITING AUTHORIZATION</div>
          </div>

          <div className="metric-summary-item">
            <span className="metric-label">Shifts Completed</span>
            <div className="metric-value">{summary.completedCount}</div>
            <div className="metric-sub">{summary.notClockedInCount} NOT YET CLOCKED IN</div>
          </div>
        </div>
      </section>

      {/* FILTER TABS & SEARCH */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="tabs-nav" style={{ margin: 0 }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === "ALL" ? "active" : ""}`}
            onClick={() => setActiveTab("ALL")}
          >
            <span>All Staff ({roster.length})</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "ON_DUTY" ? "active" : ""}`}
            onClick={() => setActiveTab("ON_DUTY")}
          >
            <span className="eyebrow-dot" style={{ backgroundColor: "var(--green)" }} />
            <span>On Duty ({summary.onDutyCount})</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "EXCEPTIONS" ? "active" : ""}`}
            onClick={() => setActiveTab("EXCEPTIONS")}
          >
            <span className="eyebrow-dot" style={{ backgroundColor: "var(--amber)" }} />
            <span>Exceptions ({summary.exceptionPendingCount})</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "COMPLETED" ? "active" : ""}`}
            onClick={() => setActiveTab("COMPLETED")}
          >
            <span>Completed ({summary.completedCount})</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "ABSENT" ? "active" : ""}`}
            onClick={() => setActiveTab("ABSENT")}
          >
            <span>Not Clocked In ({summary.notClockedInCount})</span>
          </button>
        </div>

        <div style={{ position: "relative", width: 260 }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search officer or estate…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
            <Icons.Search size={14} />
          </span>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="alert alert-danger" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icons.AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ROSTER CONTENT */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredRoster.length === 0 ? (
        <EmptyState
          title="No Officers Match Criteria"
          description={
            search
              ? `No workforce records matching "${search}" for ${selectedDate}.`
              : `No officers recorded under this category for ${selectedDate}.`
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--muted)" }}>
            <span>
              Showing {(safeRosterPage - 1) * ROSTER_PAGE_SIZE + 1}–{Math.min(safeRosterPage * ROSTER_PAGE_SIZE, filteredRoster.length)} of {filteredRoster.length.toLocaleString()} staff
            </span>
            {rosterTotalPages > 1 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button type="button" className="btn btn-secondary btn-sm" disabled={safeRosterPage <= 1} onClick={() => setRosterPage((p) => Math.max(1, p - 1))}>
                  <span>Prev</span>
                </button>
                <span>Page {safeRosterPage} / {rosterTotalPages}</span>
                <button type="button" className="btn btn-secondary btn-sm" disabled={safeRosterPage >= rosterTotalPages} onClick={() => setRosterPage((p) => Math.min(rosterTotalPages, p + 1))}>
                  <span>Next</span>
                </button>
              </div>
            )}
          </div>
          {pagedRoster.map((item) => {
            const hasStarted = item.hasStarted;
            const isCompleted = item.hasEnded;
            const isExceptionPending = item.status === "EXCEPTION_PENDING";
            const isExceptionApproved = item.status === "EXCEPTION_APPROVED";
            const isExceptionRejected = item.status === "EXCEPTION_REJECTED";
            const isNotClocked = item.status === "NOT_CLOCKED_IN";
            const isOnDuty = hasStarted && !isCompleted && !isExceptionRejected;

            return (
              <div
                key={`${item.officerId}_${item.farmId}`}
                className="compact-card hover-glow"
                style={{
                  padding: 22,
                  gap: 16,
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {/* CARD ROW: Officer Info + Status + Geofence Pill */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  {/* Left: Officer Identification */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: "50%",
                        backgroundColor: "var(--line)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 600,
                        fontSize: 15,
                        color: "var(--ink)",
                      }}
                    >
                      {item.officerName.slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>
                          {item.officerName}
                        </span>
                        <RoleBadge role="FARM_OFFICER" />
                      </div>
                      <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                        {item.officerEmail} &bull; Assigned to <strong style={{ color: "var(--ink)" }}>{item.farmName}</strong> ({item.farmLocation})
                      </div>
                    </div>
                  </div>

                  {/* Right: Operational Status Badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {isNotClocked && (
                      <span className="badge badge-muted">
                        NOT CLOCKED IN
                      </span>
                    )}
                    {isOnDuty && (
                      <span className="badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span className="telemetry-live-dot" /> ON DUTY ({formatDuration(item.durationMinutes)})
                      </span>
                    )}
                    {isCompleted && (
                      <span className="badge badge-blue">
                        COMPLETED ({formatDuration(item.durationMinutes)})
                      </span>
                    )}
                    {isExceptionPending && (
                      <span className="badge badge-amber" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Icons.AlertTriangle size={12} /> EXCEPTION PENDING
                      </span>
                    )}
                    {isExceptionApproved && (
                      <span className="badge badge-green">
                        EXCEPTION AUTHORIZED
                      </span>
                    )}
                    {isExceptionRejected && (
                      <span className="badge badge-danger">
                        EXCEPTION REJECTED
                      </span>
                    )}

                    {/* Geofence Status Pill */}
                    {hasStarted && (
                      item.withinGeofence ? (
                        <span
                          className="badge badge-green"
                          title={`Within boundary: ${item.distanceMeters ?? 0}m from estate center`}
                        >
                          <Icons.Check size={12} /> VERIFIED ON-SITE ({item.distanceMeters ?? 0}m)
                        </span>
                      ) : (
                        <span
                          className="badge badge-amber"
                          title={`Outside geofence: ${item.distanceMeters ?? 0}m from estate`}
                        >
                          <Icons.MapPin size={12} /> OUTSIDE GEOFENCE (+{item.distanceMeters ?? 0}m)
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* TIMELINE & SHIFT METRICS */}
                {hasStarted ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 12,
                      padding: "10px 14px",
                      backgroundColor: "var(--canvas)",
                      border: "1px solid var(--canvas)",
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <span className="label" style={{ fontSize: 10 }}>CLOCK IN</span>
                      <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                        {formatTime(item.startAt)}
                      </div>
                    </div>

                    <div>
                      <span className="label" style={{ fontSize: 10 }}>CLOCK OUT</span>
                      <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                        {item.endAt ? formatTime(item.endAt) : "Active in Field"}
                      </div>
                    </div>

                    <div>
                      <span className="label" style={{ fontSize: 10 }}>SHIFT DURATION</span>
                      <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                        {formatDuration(item.durationMinutes)}
                      </div>
                    </div>

                    <div>
                      <span className="label" style={{ fontSize: 10 }}>GPS COORDINATES</span>
                      <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {item.startLatitude ? `${item.startLatitude.toFixed(4)}, ${item.startLongitude?.toFixed(4)}` : "--"}
                      </div>
                    </div>

                    {/* SELFIE PROOFS */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {item.startSelfieKey && item.attendanceId && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() =>
                            openSelfieLightbox(
                              item.attendanceId!,
                              "Clock-In Verification Selfie",
                              item.officerName,
                              formatTime(item.startAt),
                              "start"
                            )
                          }
                        >
                          <Icons.Camera size={12} />
                          <span>In-Selfie</span>
                        </button>
                      )}

                      {item.endSelfieKey && item.attendanceId && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() =>
                            openSelfieLightbox(
                              item.attendanceId!,
                              "Clock-Out Verification Selfie",
                              item.officerName,
                              formatTime(item.endAt),
                              "end"
                            )
                          }
                        >
                          <Icons.Camera size={12} />
                          <span>Out-Selfie</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="muted" style={{ fontSize: 13, fontStyle: "italic" }}>
                    Officer has not recorded shift presence on {selectedDate}. No geofence telemetry logged yet.
                  </div>
                )}

                {/* EXCEPTION REASON & AUTHORITATIVE ACTION BAR */}
                {isExceptionPending && item.exceptionId && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                      padding: "12px 16px",
                      backgroundColor: "var(--amber-light)",
                      border: "1px solid var(--amber-light)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: "70%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--amber)", fontWeight: 600, fontSize: 13 }}>
                        <Icons.AlertTriangle size={14} />
                        <span>Officer Distance Exception Reason</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--ink)" }}>
                        &ldquo;{item.exceptionReason || "No statement provided"}&rdquo; ({item.distanceMeters}m from boundary)
                      </p>
                    </div>

                    {["SUPER_ADMIN", "FARM_ADMIN"].includes(initialRole) && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-green"
                          disabled={processingExceptionId === item.exceptionId}
                          onClick={() => handleReviewException(item.exceptionId!, "APPROVED")}
                        >
                          <Icons.Check size={14} />
                          <span>Authorize Shift</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          disabled={processingExceptionId === item.exceptionId}
                          onClick={() => handleReviewException(item.exceptionId!, "REJECTED")}
                        >
                          <Icons.X size={14} />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SELFIE LIGHTBOX MODAL */}
      {viewingSelfie && (
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
          onClick={() => setViewingSelfie(null)}
        >
          <div
            className="compact-card"
            style={{
              maxWidth: 440,
              width: "100%",
              padding: 20,
              gap: 14,
              backgroundColor: "var(--canvas)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>{viewingSelfie.title}</h3>
                <div className="muted" style={{ fontSize: 12 }}>
                  {viewingSelfie.officer} &bull; Recorded at {viewingSelfie.time}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setViewingSelfie(null)}
              >
                <Icons.X size={14} />
              </button>
            </div>

            <div
              style={{
                width: "100%",
                height: 320,
                backgroundColor: "var(--surface-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "1px solid var(--surface-strong)",
              }}
            >
              {viewingSelfie.loading ? (
                <div className="muted">Loading secure photo asset…</div>
              ) : viewingSelfie.url ? (
                <img
                  src={viewingSelfie.url}
                  alt="Attendance Selfie"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div className="error">Photo could not be retrieved.</div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="badge badge-green">
                <Icons.CheckCircle size={12} /> Tamper-Proof S3 Storage
              </span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setViewingSelfie(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showHireModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowHireModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="modal card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 440, padding: 24, gap: 16, backgroundColor: "var(--card-bg, #18181b)", border: "1px solid var(--line, #27272a)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>Employ On-Site Farm Manager</div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowHireModal(false)}
                aria-label="Close"
              >
                <Icons.X size={16} />
              </button>
            </div>

            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              Create an on-site supervisor account (Farm Officer) with credentials to log daily field tasks, crew musters, and harvests.
            </p>

            <form onSubmit={handleHireOfficer} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="label" style={{ fontSize: 12, marginBottom: 4, display: "block" }}>
                  Manager Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Ramesh Patil"
                  className="input-field"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 12, marginBottom: 4, display: "block" }}>
                  Email Address (Username) *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="e.g. ramesh@farm.agaate.com"
                  className="input-field"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 12, marginBottom: 4, display: "block" }}>
                  Initial Password *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                   minLength={12}
                   placeholder="Minimum 12 characters"
                  className="input-field"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 12, marginBottom: 4, display: "block" }}>
                  Assigned Farm / Estate *
                </label>
                <select
                  name="farmId"
                  required
                  defaultValue={selectedFarmId !== "ALL" ? selectedFarmId : estates[0]?.id}
                  className="input-field"
                  style={{ width: "100%" }}
                >
                  {estates.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowHireModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={hirePending}
                >
                  {hirePending ? "Creating Credential..." : "Employ Manager"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
