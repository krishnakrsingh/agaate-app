"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

export type DrawerChanged = { id: string; status: string; followUpCount: number };

type Detail = {
  id: string;
  type: string;
  description: string;
  severity: string | null;
  impactPercent: string | number | null;
  status: string;
  level: string;
  createdAt: string;
  updatedAt: string;
  farm: { id: string; name: string; location: string };
  plot: { id: string; name: string } | null;
  cropCycle: { id: string; cropName: string } | null;
  reporter: { name: string; email: string; role: string };
  primaryImageUrl: string | null;
  media: Array<{ id: string }>;
};

type FollowUp = {
  id: string;
  action: string;
  remarks: string | null;
  createdAt: string;
  author: { name: string; role: string };
};

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  actor: { name: string; email: string } | null;
};

const NEXT_STATUS: Record<string, string[]> = {
  OPEN: ["ACKNOWLEDGED", "RESOLVED", "CLOSED"],
  ACKNOWLEDGED: ["RESOLVED", "OPEN", "CLOSED"],
  RESOLVED: ["CLOSED", "OPEN", "ACKNOWLEDGED"],
  CLOSED: ["OPEN", "ACKNOWLEDGED"],
};

function errMsg(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string") {
    return (body as { error: string }).error;
  }
  return fallback;
}

export function IncidentDrawer({
  incidentId,
  onClose,
  onChanged,
}: {
  incidentId: string;
  onClose: () => void;
  onChanged: (u: DrawerChanged) => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [fuTotal, setFuTotal] = useState(0);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditRestricted, setAuditRestricted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusPending, setStatusPending] = useState(false);
  const [fuAction, setFuAction] = useState("");
  const [fuRemarks, setFuRemarks] = useState("");
  const [fuPending, setFuPending] = useState(false);
  const [fuMsg, setFuMsg] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [dRes, fRes, aRes] = await Promise.all([
          fetch(`/api/incidents/${incidentId}`),
          fetch(`/api/incidents/${incidentId}/follow-ups?limit=50`),
          fetch(`/api/audit-logs?entityType=Incident&search=${encodeURIComponent(incidentId)}&limit=20`),
        ]);
        if (cancelled) return;
        if (!dRes.ok) {
          setError(errMsg(await dRes.json().catch(() => ({})), "Unable to load incident."));
          setLoading(false);
          return;
        }
        const d = (await dRes.json()) as Detail;
        setDetail(d);
        if (fRes.ok) {
          const f = await fRes.json();
          setFollowUps(f.followUps ?? []);
          setFuTotal(typeof f.total === "number" ? f.total : (f.followUps ?? []).length);
        }
        if (aRes.ok) {
          const a = await aRes.json();
          setAudit(Array.isArray(a) ? a : []);
        } else if (aRes.status === 403) {
          setAuditRestricted(true);
        }
      } catch {
        if (!cancelled) setError("Network error while loading incident.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  async function changeStatus(next: string) {
    if (!detail || next === detail.status) return;
    setStatusPending(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errMsg(body, "Unable to update status."));
        return;
      }
      setDetail({ ...detail, status: next });
      onChanged({ id: incidentId, status: next, followUpCount: fuTotal });
    } catch {
      setError("Network error while updating status.");
    } finally {
      setStatusPending(false);
    }
  }

  async function submitFollowUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fuAction.trim()) return;
    setFuPending(true);
    setFuMsg("");
    try {
      const post = await fetch(`/api/incidents/${incidentId}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: fuAction.trim(), remarks: fuRemarks.trim() || null }),
      });
      const body = await post.json().catch(() => ({}));
      if (!post.ok) {
        setFuMsg(errMsg(body, "Unable to add follow-up."));
        return;
      }
      const created = body as FollowUp;
      const next = [created, ...followUps].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setFollowUps(next);
      setFuTotal((n) => n + 1);
      setFuAction("");
      setFuRemarks("");
      setFuMsg("Follow-up recorded.");
      // The follow-ups API auto-acknowledges an OPEN incident.
      if (detail && detail.status === "OPEN") {
        setDetail({ ...detail, status: "ACKNOWLEDGED" });
        onChanged({ id: incidentId, status: "ACKNOWLEDGED", followUpCount: fuTotal + 1 });
      } else {
        onChanged({ id: incidentId, status: detail?.status ?? "OPEN", followUpCount: fuTotal + 1 });
      }
    } catch {
      setFuMsg("Network error while saving follow-up.");
    } finally {
      setFuPending(false);
    }
  }

  const handlers = [...new Set(followUps.map((f) => `${f.author.name} (${f.author.role.replaceAll("_", " ")})`))];

  return (
    <div
      role="dialog"
      aria-label="Incident detail"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(480px, 100%)",
        background: "var(--card)",
        borderLeft: "1px solid var(--border)",
        boxShadow: "var(--shadow-modal)",
        zIndex: 120,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <div className="label">Incident {incidentId.slice(-6).toUpperCase()}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", wordBreak: "break-all" }}>{incidentId}</div>
        </div>
        <button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
        {loading && <p className="muted">Loading incident…</p>}
        {error && (
          <div className="error">
            <span>{error}</span>
          </div>
        )}

        {detail && (
          <>
            <div>
              <div className="label">Type</div>
              <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{detail.type}</div>
              <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{detail.description}</p>
            </div>

            <div className="two-column" style={{ gap: 12 }}>
              <div>
                <div className="label">Status</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                  {(NEXT_STATUS[detail.status] ?? ["OPEN", "ACKNOWLEDGED", "RESOLVED"]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="btn btn-sm btn-secondary"
                      disabled={statusPending}
                      onClick={() => void changeStatus(s)}
                    >
                      {s === "ACKNOWLEDGED" ? "Acknowledge" : s === "RESOLVED" ? "Resolve" : s === "CLOSED" ? "Close" : "Reopen"}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 6 }}>
                  Current: {detail.status.replaceAll("_", " ")}
                  {statusPending ? " — saving…" : ""}
                </div>
              </div>
              <div>
                <div className="label">Severity</div>
                <div style={{ marginTop: 4 }}>{detail.severity || "MEDIUM"}</div>
                {detail.impactPercent != null && (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                    Impact: {String(detail.impactPercent)}%
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="label">Links</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <Link className="btn btn-sm btn-secondary" href={`/farms/${detail.farm.id}`}>
                  Open Farm 360
                </Link>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 6 }}>
                {detail.farm.name} — {detail.farm.location}
                {detail.plot ? ` · Plot ${detail.plot.name}` : ""}
                {detail.cropCycle ? ` · ${detail.cropCycle.cropName}` : ""}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 4 }}>
                Reported by {detail.reporter.name} ({detail.reporter.role.replaceAll("_", " ")})
              </div>
              {handlers.length > 0 && (
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Handled by: {handlers.join(", ")}
                </div>
              )}
            </div>

            {detail.primaryImageUrl && (
              <div>
                <div className="label">Evidence</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detail.primaryImageUrl}
                  alt="Incident evidence"
                  style={{ marginTop: 6, maxWidth: "100%", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
                />
              </div>
            )}

            <div>
              <div className="label">Follow-up thread ({fuTotal})</div>
              {followUps.length === 0 && <p className="muted" style={{ marginTop: 4 }}>No follow-ups recorded yet.</p>}
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {followUps.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      padding: "8px 10px",
                      background: "var(--card-muted)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong style={{ color: "var(--text-main)" }}>{f.action}</strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", flexShrink: 0 }}>
                        {new Date(f.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {f.remarks && <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>{f.remarks}</p>}
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      By {f.author.name} ({f.author.role.replaceAll("_", " ")})
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={submitFollowUp} style={{ display: "grid", gap: 8, marginTop: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Action taken / scheduled</label>
                  <input
                    value={fuAction}
                    onChange={(e) => setFuAction(e.target.value)}
                    required
                    minLength={3}
                    maxLength={120}
                    placeholder="e.g. Spray scheduled"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Remarks</label>
                  <textarea value={fuRemarks} onChange={(e) => setFuRemarks(e.target.value)} maxLength={2000} rows={2} />
                </div>
                {fuMsg && <div className="hint"><span>{fuMsg}</span></div>}
                <button type="submit" className="btn btn-sm btn-primary" disabled={fuPending} style={{ width: "fit-content" }}>
                  {fuPending ? "Saving…" : "Add follow-up"}
                </button>
              </form>
            </div>

            <div>
              <div className="label">Audit</div>
              {auditRestricted && (
                <p className="muted" style={{ marginTop: 4 }}>Audit history is restricted to farm admins.</p>
              )}
              {!auditRestricted && audit.length === 0 && (
                <p className="muted" style={{ marginTop: 4 }}>No audit entries visible for this incident.</p>
              )}
              {audit.length > 0 && (
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  {audit.map((a) => (
                    <div key={a.id} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      <strong style={{ color: "var(--text-main)" }}>{a.action}</strong> · {a.entityType} ·{" "}
                      {new Date(a.createdAt).toLocaleString()}
                      {a.actor ? ` · ${a.actor.name}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
