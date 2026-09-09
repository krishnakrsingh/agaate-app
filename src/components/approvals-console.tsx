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
  const [totals, setTotals] = useState<{ exceptions: number | null; locations: number | null; log: number | null }>({ exceptions: null, locations: null, log: null });
  const [selectedExceptions, setSelectedExceptions] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<null | { status: "APPROVED" | "REJECTED" }>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  // Bounded page (100) with real totals via X-Total-Count — the old build
  // fetched defaults and reported array lengths as queue depths.
  const load = () =>
    Promise.all([
      fetch("/api/attendance-exceptions?limit=100&offset=0"),
      fetch("/api/location-change-requests?limit=100&offset=0"),
      fetch("/api/attendance/list?limit=100&offset=0"),
    ])
      .then(async ([a, l, t]) => {
        if (!a.ok || !l.ok || !t.ok) throw new Error("Unable to load administrator queues.");
        const total = (r: Response) => {
          const h = r.headers.get("X-Total-Count");
          return h == null ? null : Number(h);
        };
        setTotals({ exceptions: total(a), locations: total(l), log: total(t) });
        setExceptions(await a.json());
        setLocations((await l.json()).filter((x: LocationRequest) => x.status === "PENDING"));
        setAttendance(await t.json());
        setSelectedExceptions(new Set());
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
          <span>Attendance Exceptions ({totals.exceptions != null ? totals.exceptions.toLocaleString() : exceptions.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "locations" ? "active" : ""}`}
          onClick={() => setActiveTab("locations")}
        >
          <Icons.MapPin size={14} />
          <span>Location Change Requests ({totals.locations != null ? totals.locations.toLocaleString() : locations.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "log" ? "active" : ""}`}
          onClick={() => setActiveTab("log")}
        >
          <Icons.Users size={14} />
          <span>Attendance Audit Log ({totals.log != null ? totals.log.toLocaleString() : attendance.length})</span>
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
            <p className="muted" style={{ fontSize: 12 }}>
              {totals.exceptions != null && totals.exceptions > exceptions.length
                ? `Showing ${exceptions.length} of ${totals.exceptions.toLocaleString()} — narrow by farm roster or review in batches.`
                : "Review individually or select a batch below."}
            </p>
          </div>

          {selectedExceptions.size > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", background: "var(--amber-light)", border: "1px solid var(--amber-light)", borderRadius: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 12 }}>{selectedExceptions.size} selected</strong>
              <button type="button" className="btn btn-sm btn-green" onClick={() => setBulkConfirm({ status: "APPROVED" })}>Approve batch</button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => setBulkConfirm({ status: "REJECTED" })}>Reject batch</button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSelectedExceptions(new Set())}>Clear</button>
            </div>
          )}

          {bulkConfirm && (
            <div className="modal-overlay" onClick={() => setBulkConfirm(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: 20 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{bulkConfirm.status === "APPROVED" ? "Approve" : "Reject"} {selectedExceptions.size} exception(s)?</h3>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>Only pending items transition; already-reviewed rows are reported as skipped, never silently applied.</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setBulkConfirm(null)}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={bulkBusy}
                    onClick={() => {
                      setBulkBusy(true);
                      setError("");
                      fetch("/api/attendance-exceptions/bulk", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ exceptionIds: [...selectedExceptions], status: bulkConfirm.status, expectedCount: selectedExceptions.size }),
                      })
                        .then(async (r) => {
                          const body = await r.json().catch(() => ({}));
                          if (!r.ok) throw new Error(body.error ?? "Bulk review failed.");
                          setMessage(`${body.updated} exception(s) ${bulkConfirm.status.toLowerCase()}.${body.skipped ? ` ${body.skipped} skipped.` : ""}`);
                          setBulkConfirm(null);
                          void load();
                        })
                        .catch((e: any) => setError(e.message ?? "Bulk review failed."))
                        .finally(() => setBulkBusy(false));
                    }}
                  >
                    {bulkBusy ? "Working…" : `Confirm (${selectedExceptions.size})`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {exceptions.length ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        aria-label="Select page"
                        checked={exceptions.length > 0 && exceptions.every((ex) => selectedExceptions.has(ex.id))}
                        onChange={() => setSelectedExceptions((prev) => {
                          const next = new Set(prev);
                          if (exceptions.every((ex) => next.has(ex.id))) exceptions.forEach((ex) => next.delete(ex.id));
                          else exceptions.forEach((ex) => next.add(ex.id));
                          return next;
                        })}
                      />
                    </th>
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
                        <input
                          type="checkbox"
                          aria-label="Select exception"
                          checked={selectedExceptions.has(ex.id)}
                          onChange={() => setSelectedExceptions((prev) => {
                            const next = new Set(prev);
                            if (next.has(ex.id)) next.delete(ex.id);
                            else next.add(ex.id);
                            return next;
                          })}
                        />
                      </td>
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
            <div className="table-container">
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
            <div className="table-container">
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
