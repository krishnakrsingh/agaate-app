"use client";

import { useEffect, useState } from "react";
import { Icons } from "../icons";

export type WorkloadOfficer = {
  officerId: string;
  officerName: string | null;
  open: number;
  overdue: number;
};

// Workload view: per-officer open/overdue counts (bounded top 50,
// server-side). Clicking a row filters the ledger to that officer.
export function TasksWorkload({
  farmId,
  clientId,
  selectedOfficerId,
  onSelect,
}: {
  farmId: string | null;
  clientId: string | null;
  selectedOfficerId: string | null;
  onSelect: (officer: { id: string; name: string } | null) => void;
}) {
  const [officers, setOfficers] = useState<WorkloadOfficer[]>([]);
  const [unassigned, setUnassigned] = useState({ open: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (farmId) params.set("farmId", farmId);
    if (clientId) params.set("clientId", clientId);
    fetch(`/api/hq/tasks/workload?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Unable to load workload.");
        return r.json();
      })
      .then((b) => {
        if (cancelled) return;
        setOfficers(Array.isArray(b.officers) ? b.officers : []);
        setUnassigned(b.unassigned ?? { open: 0, overdue: 0 });
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message ?? "Unable to load workload.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [farmId, clientId]);

  return (
    <section className="compact-card" style={{ padding: 16 }} aria-label="Officer workload">
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Icons.Users size={15} />
        <strong style={{ fontSize: 13 }}>Officer workload</strong>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          Top 50 officers by overdue load{farmId || clientId ? " (in current farm/client scope)" : " (platform-wide)"}. Select a row to filter the ledger.
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          UNASSIGNED OPEN: {unassigned.open.toLocaleString()}
          {unassigned.overdue > 0 && <span style={{ color: "var(--red)", fontWeight: 700 }}> • {unassigned.overdue.toLocaleString()} OVERDUE</span>}
        </span>
      </div>

      {loading && <p style={{ fontSize: 12, color: "var(--muted)" }}>Loading workload…</p>}

      {!loading && error && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <p style={{ fontSize: 12, color: "var(--red)", fontWeight: 600 }}>{error}</p>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ height: 28, fontSize: 12 }}
            onClick={() => {
              setLoading(true);
              setError("");
              const params = new URLSearchParams();
              if (farmId) params.set("farmId", farmId);
              if (clientId) params.set("clientId", clientId);
              fetch(`/api/hq/tasks/workload?${params.toString()}`)
                .then(async (r) => {
                  if (!r.ok) throw new Error("Unable to load workload.");
                  return r.json();
                })
                .then((b) => {
                  setOfficers(Array.isArray(b.officers) ? b.officers : []);
                  setUnassigned(b.unassigned ?? { open: 0, overdue: 0 });
                  setLoading(false);
                })
                .catch((e) => {
                  setError(e.message ?? "Unable to load workload.");
                  setLoading(false);
                });
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && officers.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--muted)" }}>No open tasks in scope — nothing overdue, nothing queued.</p>
      )}

      {!loading && !error && officers.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {officers.map((o) => {
            const active = selectedOfficerId === o.officerId;
            return (
              <button
                key={o.officerId}
                type="button"
                onClick={() => onSelect(active ? null : { id: o.officerId, name: o.officerName ?? "Former officer" })}
                title={`Filter ledger to ${o.officerName ?? o.officerId}`}
                style={{
                  background: active ? "var(--green-light)" : "transparent",
                  border: active ? "1px solid var(--primary)" : "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  minWidth: 150,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 650, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {o.officerName ?? "Former officer"}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  {o.open.toLocaleString()} OPEN
                  {o.overdue > 0 ? (
                    <span style={{ color: "var(--red)", fontWeight: 700 }}> • {o.overdue.toLocaleString()} OVERDUE</span>
                  ) : (
                    " • ON TRACK"
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
