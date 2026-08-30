"use client";
import { useEffect, useState } from "react";
import { Icons } from "./icons";

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
          <Icons.AlertTriangle size={16} />
          <span>Attendance Exceptions ({exceptions.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "locations" ? "active" : ""}`}
          onClick={() => setActiveTab("locations")}
        >
          <Icons.Compass size={16} />
          <span>Location Change Requests ({locations.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "log" ? "active" : ""}`}
          onClick={() => setActiveTab("log")}
        >
          <Icons.Clock size={16} />
          <span>Attendance Logs ({attendance.length})</span>
        </button>
      </div>

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="hint" role="status">
          <Icons.CheckCircle size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* TAB 1: ATTENDANCE EXCEPTIONS */}
      {activeTab === "exceptions" && (
        <div style={{ display: "grid", gap: 14 }}>
          {exceptions.map((x) => (
            <article
              className="card"
              key={x.id}
              style={{
                margin: 0,
                border: "1px solid var(--harvest-border)",
                background: "white",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: "1.1rem" }}>{x.attendance.user.name}</strong>
                    <span className="priority-tag medium">
                      {Number(x.distanceMeters).toFixed(0)}m outside geofence
                    </span>
                  </div>

                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
                    Farm: <strong>{x.attendance.farm.name}</strong> &bull; {x.attendance.user.email}
                  </p>

                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "var(--slate-50)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "0.88rem",
                    }}
                  >
                    <strong>Officer Reason:</strong> {x.reason}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => review(`/api/attendance-exceptions/${x.id}`, "APPROVED", x.id)}
                    disabled={reviewingId === x.id}
                  >
                    <Icons.Check size={14} />
                    <span>Approve Exception</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => review(`/api/attendance-exceptions/${x.id}`, "REJECTED", x.id)}
                    disabled={reviewingId === x.id}
                  >
                    <Icons.X size={14} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </article>
          ))}

          {!exceptions.length && (
            <div className="empty">
              <div className="empty-icon">
                <Icons.CheckCircle size={24} />
              </div>
              <p>No pending attendance exceptions to review.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOCATION REQUESTS */}
      {activeTab === "locations" && (
        <div style={{ display: "grid", gap: 14 }}>
          {locations.map((x) => (
            <article className="card" key={x.id} style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div className="eyebrow" style={{ color: "var(--sky-blue)" }}>
                    PROPOSED NEW COORDINATES &bull; {x.farm?.name || x.farmId}
                  </div>
                  <strong style={{ fontSize: "1.15rem", display: "block", margin: "2px 0 4px" }}>
                    Lat: {x.proposedLatitude}, Long: {x.proposedLongitude}
                  </strong>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-main)", margin: "4px 0" }}>
                    <strong>Reason:</strong> {x.reason}
                  </p>
                  <small className="muted">
                    Farm: <strong>{x.farm?.name ?? x.farmId}</strong> {x.farm?.location ? `(${x.farm.location})` : ""}
                  </small>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => review(`/api/location-change-requests/${x.id}`, "APPROVED", x.id)}
                    disabled={reviewingId === x.id}
                  >
                    <Icons.Check size={14} />
                    <span>Approve & Update Farm</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => review(`/api/location-change-requests/${x.id}`, "REJECTED", x.id)}
                    disabled={reviewingId === x.id}
                  >
                    <Icons.X size={14} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </article>
          ))}

          {!locations.length && (
            <div className="empty">
              <div className="empty-icon">
                <Icons.Compass size={24} />
              </div>
              <p>No pending farm location change requests.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ATTENDANCE LOG */}
      {activeTab === "log" && (
        <div style={{ display: "grid", gap: 10 }}>
          {attendance.map((x) => (
            <article
              className="card"
              key={x.id}
              style={{
                margin: 0,
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: "1rem" }}>{x.user.name}</strong>
                  <span className="muted">&bull;</span>
                  <span style={{ fontWeight: 600 }}>{x.farm.name}</span>
                  <span className={`status ${x.status.toLowerCase()}`}>{x.status}</span>
                </div>

                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Date: {new Date(x.attendanceDate).toLocaleDateString()} &bull; Start:{" "}
                  {x.startAt ? new Date(x.startAt).toLocaleTimeString() : "—"}{" "}
                  {x.startLatitude && `(${x.startLatitude}, ${x.startLongitude})`} &bull; End:{" "}
                  {x.endAt ? new Date(x.endAt).toLocaleTimeString() : "Open"}{" "}
                  {x.endLatitude && `(${x.endLatitude}, ${x.endLongitude})`}
                </div>
              </div>
            </article>
          ))}

          {!attendance.length && (
            <div className="empty">
              <p>No attendance records logged yet.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
