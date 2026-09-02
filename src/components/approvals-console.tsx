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
    farm: { name: string; geofenceRadiusMeters?: number };
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
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Console Tabs */}
      <div className="tabs-nav">
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
          <span>Attendance Audit Log ({attendance.length})</span>
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
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              <span>ATTENDANCE GOVERNANCE</span>
            </div>
            <h2 className="section-title">Pending Distance Exceptions</h2>
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
                        <div className="muted" style={{ fontSize: "12px" }}>{ex.attendance.user.email}</div>
                      </td>
                      <td>{ex.attendance.farm.name}</td>
                      <td>
                        <span className="priority-tag high">
                          {ex.distanceMeters}m (radius: {ex.attendance.farm.geofenceRadiusMeters ?? 500}m)
                        </span>
                      </td>
                      <td style={{ maxWidth: 280, fontSize: "13px" }}>&ldquo;{ex.reason}&rdquo;</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-green"
                            disabled={reviewingId === ex.id}
                            onClick={() =>
                              review(`/api/attendance-exceptions/${ex.id}`, "APPROVED", ex.id)
                            }
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            disabled={reviewingId === ex.id}
                            onClick={() =>
                              review(`/api/attendance-exceptions/${ex.id}`, "REJECTED", ex.id)
                            }
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
              icon={<Icons.Shield size={24} />}
              title="No pending attendance exceptions"
              description="All officer clock-in records are verified within authorized farm geofence boundaries."
            />
          )}
        </section>
      )}

      {/* TAB 2: LOCATION CHANGE REQUESTS */}
      {activeTab === "locations" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              <span>GEODATA GOVERNANCE</span>
            </div>
            <h2 className="section-title">Pending Location Change Requests</h2>
          </div>

          {locations.length ? (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Farm</th>
                    <th>Proposed Coordinates</th>
                    <th>Justification</th>
                    <th>Review Action</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc.id}>
                      <td>
                        <strong>{loc.farm?.name ?? loc.farmId}</strong>
                        <div className="muted" style={{ fontSize: "12px" }}>{loc.farm?.location}</div>
                      </td>
                      <td className="data">
                        {Number(loc.proposedLatitude).toFixed(5)}, {Number(loc.proposedLongitude).toFixed(5)}
                      </td>
                      <td style={{ maxWidth: 300, fontSize: "13px" }}>&ldquo;{loc.reason}&rdquo;</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-green"
                            disabled={reviewingId === loc.id}
                            onClick={() =>
                              review(`/api/location-change-requests/${loc.id}`, "APPROVED", loc.id)
                            }
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            disabled={reviewingId === loc.id}
                            onClick={() =>
                              review(`/api/location-change-requests/${loc.id}`, "REJECTED", loc.id)
                            }
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
              icon={<Icons.MapPin size={24} />}
              title="No pending location requests"
              description="No pending GPS coordinate adjustments from field staff."
            />
          )}
        </section>
      )}

      {/* TAB 3: ATTENDANCE AUDIT LOG */}
      {activeTab === "log" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              <span>AUDIT TRAIL</span>
            </div>
            <h2 className="section-title">Comprehensive Attendance Log</h2>
          </div>

          {attendance.length ? (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Officer</th>
                    <th>Farm</th>
                    <th>Status</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>GPS Start</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a) => (
                    <tr key={a.id}>
                      <td className="data" style={{ whiteSpace: "nowrap" }}>{new Date(a.attendanceDate).toLocaleDateString()}</td>
                      <td><strong>{a.user.name}</strong></td>
                      <td>{a.farm.name}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td className="data">{a.startAt ? new Date(a.startAt).toLocaleTimeString() : "—"}</td>
                      <td className="data">{a.endAt ? new Date(a.endAt).toLocaleTimeString() : "In Progress"}</td>
                      <td className="data" style={{ fontSize: "12px" }}>
                        {a.startLatitude ? `${Number(a.startLatitude).toFixed(4)}, ${Number(a.startLongitude).toFixed(4)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<Icons.Users size={24} />}
              title="No attendance records in audit log"
            />
          )}
        </section>
      )}
    </section>
  );
}
