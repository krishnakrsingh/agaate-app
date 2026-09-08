"use client";
import { useEffect, useState, useMemo } from "react";
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
    key: string,
    title: string,
    officer: string,
    time: string
  ) => {
    setViewingSelfie({ url: null, title, officer, time, loading: true });
    try {
      const res = await fetch(`/api/attendance/selfie?key=${encodeURIComponent(key)}`);
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
            <select
              className="input-field"
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              style={{ width: 180, padding: "6px 10px", fontSize: 13 }}
            >
              <option value="ALL">All Managed Estates</option>
              {estates.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.name}
                </option>
              ))}
            </select>
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
        </div>
      </div>

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
          {filteredRoster.map((item) => {
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
                      border: "1px solid var(--line)",
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
                      {item.startSelfieKey && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() =>
                            openSelfieLightbox(
                              item.startSelfieKey!,
                              "Clock-In Verification Selfie",
                              item.officerName,
                              formatTime(item.startAt)
                            )
                          }
                        >
                          <Icons.Camera size={12} />
                          <span>In-Selfie</span>
                        </button>
                      )}

                      {item.endSelfieKey && (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ padding: "4px 8px", fontSize: 11 }}
                          onClick={() =>
                            openSelfieLightbox(
                              item.endSelfieKey!,
                              "Clock-Out Verification Selfie",
                              item.officerName,
                              formatTime(item.endAt)
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
                      backgroundColor: "rgba(217, 119, 6, 0.08)",
                      border: "1px solid var(--amber)",
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
                backgroundColor: "var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "1px solid var(--line)",
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
    </div>
  );
}
