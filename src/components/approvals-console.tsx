"use client";
import { useEffect, useState } from "react";
import { Icons } from "./icons";
import { EmptyState } from "./ui/empty-state";
import { StatusBadge } from "./ui/badge";

type Exception = {
  id: string;
  distanceMeters: string;
  reason: string;
  attendance: {
    user: { name: string; email: string };
    farm: { name: string };
  };
};

type LocationRequest = {
  id: string;
  proposedLatitude: string;
  proposedLongitude: string;
  reason: string;
  farmId: string;
  status: string;
  farm?: { id: string; name: string; location?: string };
};

type Attendance = {
  id: string;
  attendanceDate: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  startLatitude: string | null;
  startLongitude: string | null;
  endLatitude: string | null;
  endLongitude: string | null;
  user: { name: string };
  farm: { name: string };
};

export function ApprovalsConsole() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [locations, setLocations] = useState<LocationRequest[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [activeTab, setActiveTab] = useState<"exceptions" | "locations" | "log">("exceptions");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = () =>
    Promise.all([
      fetch("/api/attendance-exceptions"),
      fetch("/api/location-change-requests"),
      fetch("/api/attendance/list"),
    ])
      .then(async ([a, l, t]) => {
        if (!a.ok || !l.ok || !t.ok) throw new Error("Unable to load administrator queues.");
        setExceptions(await a.json());
        setLocations((await l.json()).filter((x: LocationRequest) => x.status === "PENDING"));
        setAttendance(await t.json());
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    void load();
  }, []);

  async function review(url: string, status: string, id: string) {
    setReviewingId(id);
    setError("");
    setMessage("");

    try {
      const r = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setReviewingId(null);

      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setError(body.error ?? "Review failed.");
        return;
      }

      setMessage(`Decision recorded: ${status.toLowerCase()}.`);
      void load();
    } catch {
      setReviewingId(null);
      setError("Network error.");
    }
  }

  return (
    <section>
      {/* Console Tabs */}
      <div className="tabs-nav" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === "exceptions" ? "active" : ""}`}
          onClick={() => setActiveTab("exceptions")}
        >
          <Icons.Shield size={14} />
          <span>Attendance Exceptions ({exceptions.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "locations" ? "active" : ""}`}
          onClick={() => setActiveTab("locations")}
        >
          <Icons.MapPin size={14} />
          <span>Location Change Requests ({locations.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "log" ? "active" : ""}`}
          onClick={() => setActiveTab("log")}
        >
          <Icons.Users size={14} />
          <span>Attendance Log ({attendance.length})</span>
        </button>
      </div>

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="success-banner" role="status">
          <Icons.CheckCircle size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* TAB 1: ATTENDANCE EXCEPTIONS */}
      {activeTab === "exceptions" && (
        <article className="card" style={{ padding: 24 }}>
          <div className="card-header">
            <div>
              <div className="eyebrow">ATTENDANCE GOVERNANCE</div>
              <h3 style={{ margin: "2px 0 0" }}>Pending Distance Exceptions</h3>
            </div>
          </div>

          {exceptions.length ? (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Officer</th>
                    <th>Farm</th>
                    <th>Distance Variance</th>
                    <th>Officer Reason</th>
                    <th>Review Action</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((ex) => (
                    <tr key={ex.id}>
                      <td>
                        <strong>{ex.attendance.user.name}</strong>
                        <div style={{ fontSize: 12, color: "var(--body-muted)" }}>{ex.attendance.user.email}</div>
                      </td>
                      <td>{ex.attendance.farm.name}</td>
                      <td>
                        <span className="mono-label" style={{ color: "#92400e", background: "#fffbeb", padding: "2px 8px", borderRadius: "var(--radius-xs)" }}>
                          {ex.distanceMeters}m outside 500m
                        </span>
                      </td>
                      <td style={{ maxWidth: 260 }}>&ldquo;{ex.reason}&rdquo;</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={reviewingId === ex.id}
                            onClick={() => review(`/api/attendance-exceptions/${ex.id}`, "APPROVED", ex.id)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            disabled={reviewingId === ex.id}
                            onClick={() => review(`/api/attendance-exceptions/${ex.id}`, "REJECTED", ex.id)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<Icons.Shield size={28} />}
              title="No pending exceptions"
              description="All officer attendance records are within geofence boundaries."
            />
          )}
        </article>
      )}

      {/* TAB 2: LOCATION CHANGE REQUESTS */}
      {activeTab === "locations" && (
        <article className="card" style={{ padding: 24 }}>
          <div className="card-header">
            <div>
              <div className="eyebrow">COORDINATE GOVERNANCE</div>
              <h3 style={{ margin: "2px 0 0" }}>Proposed Farm GPS Adjustments</h3>
            </div>
          </div>

          {locations.length ? (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Estate</th>
                    <th>Proposed Coordinates</th>
                    <th>Reason</th>
                    <th>Review Action</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc.id}>
                      <td><strong>{loc.farm?.name ?? loc.farmId}</strong></td>
                      <td>
                        <span className="mono-label">
                          {Number(loc.proposedLatitude).toFixed(4)}, {Number(loc.proposedLongitude).toFixed(4)}
                        </span>
                      </td>
                      <td style={{ maxWidth: 260 }}>&ldquo;{loc.reason}&rdquo;</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={reviewingId === loc.id}
                            onClick={() => review(`/api/location-change-requests/${loc.id}`, "APPROVED", loc.id)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            disabled={reviewingId === loc.id}
                            onClick={() => review(`/api/location-change-requests/${loc.id}`, "REJECTED", loc.id)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<Icons.MapPin size={28} />}
              title="No pending location requests"
              description="No farm coordinate changes are pending administrator review."
            />
          )}
        </article>
      )}

      {/* TAB 3: ATTENDANCE AUDIT LOG */}
      {activeTab === "log" && (
        <article className="card" style={{ padding: 24 }}>
          <div className="card-header">
            <div>
              <div className="eyebrow">HISTORICAL TELEMETRY</div>
              <h3 style={{ margin: "2px 0 0" }}>Global Attendance Log</h3>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Officer</th>
                  <th>Farm</th>
                  <th>Shift Status</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((att) => (
                  <tr key={att.id}>
                    <td><span className="mono-label">{att.attendanceDate?.slice(0, 10)}</span></td>
                    <td><strong>{att.user.name}</strong></td>
                    <td>{att.farm.name}</td>
                    <td><StatusBadge status={att.status} /></td>
                    <td>{att.startAt ? new Date(att.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td>{att.endAt ? new Date(att.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </section>
  );
}
