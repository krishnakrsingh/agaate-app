"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { Icons } from "./icons";
import { EmptyState } from "./ui/empty-state";
import { CardSkeleton } from "./ui/skeleton";
import { formatDateTime } from "@/lib/business";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: any;
  createdAt: string;
  actor: { name: string; email: string } | null;
};

const ACTION_OPTIONS = [
  "ALL",
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGE",
  "ACTIVATE",
  "ARCHIVE",
  "RESTORE",
  "BULK_UPDATE",
  "ASSIGN_FARM_OFFICER",
  "UNASSIGN_FARM_OFFICER",
  "ATTENDANCE_EXCEPTION_APPROVED",
  "ATTENDANCE_EXCEPTION_REJECTED",
  "LOCATION_CHANGE_APPROVED",
  "LOCATION_CHANGE_REJECTED",
  "COMPLETE",
  "CANCEL",
];

const ENTITY_OPTIONS = [
  "ALL",
  "Farm",
  "Plot",
  "CropCycle",
  "Task",
  "User",
  "Client",
  "FarmAccess",
  "Incident",
  "IncidentFollowUp",
  "AttendanceException",
  "LocationChangeRequest",
  "CropMonitoring",
  "AgronomyPrescription",
  "HarvestLog",
  "ExpenseLog",
  "MediaAsset",
];

export function AuditConsole() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchLogs = async (p = page) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "50", offset: String((p - 1) * 50) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (actionFilter !== "ALL") params.set("action", actionFilter);
      if (entityFilter !== "ALL") params.set("entityType", entityFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load system audit records.");
      const h = res.headers.get("X-Total-Count");
      setTotal(h == null ? null : Number(h));
      setLogs((await res.json()) || []);
    } catch (err: any) {
      setError(err.message || "Network error loading audit trail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, actionFilter, entityFilter, dateFrom, dateTo, page]);

  const exportCsv = () => {
    const rows = [
      ["time", "action", "actor", "email", "entity", "entityId"],
      ...logs.map((l) => [
        l.createdAt,
        l.action,
        l.actor?.name || "system",
        l.actor?.email || "",
        l.entityType,
        l.entityId,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audit-page${page}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const filteredLogs = logs;

  const getActionBadgeColor = (action: string) => {
    if (action.includes("APPROVED") || action.includes("CREATE")) return "badge-green";
    if (action.includes("REJECTED") || action.includes("DELETE")) return "badge-danger";
    if (action.includes("EXCEPTION") || action.includes("UPDATE")) return "badge-amber";
    return "badge-blue";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* FILTER CONTROLS */}
      <div
        className="compact-card"
        style={{
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="label" style={{ fontSize: 11 }}>ACTION:</span>
            <select
              className="input-field"
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              style={{ width: 200, padding: "6px 10px", fontSize: 13 }}
            >
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>{a === "ALL" ? "All actions" : a}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="label" style={{ fontSize: 11 }}>ENTITY:</span>
            <select
              className="input-field"
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              style={{ width: 170, padding: "6px 10px", fontSize: 13 }}
            >
              {ENTITY_OPTIONS.map((e) => (
                <option key={e} value={e}>{e === "ALL" ? "All entities" : e}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="label" style={{ fontSize: 11 }}>FROM:</span>
            <input
              type="date"
              className="input-field"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              style={{ padding: "6px 10px", fontSize: 13 }}
            />
            <span className="label" style={{ fontSize: 11 }}>TO:</span>
            <input
              type="date"
              className="input-field"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              style={{ padding: "6px 10px", fontSize: 13 }}
            />
          </div>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => void fetchLogs()}
            title="Refresh Audit Trail"
          >
            <Icons.Refresh size={14} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={exportCsv}
            disabled={logs.length === 0}
            title="Export current page as CSV"
          >
            <span>Export CSV</span>
          </button>
          {(actionFilter !== "ALL" || entityFilter !== "ALL" || dateFrom || dateTo || debouncedSearch) && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setActionFilter("ALL");
                setEntityFilter("ALL");
                setDateFrom("");
                setDateTo("");
                setSearch("");
                setPage(1);
              }}
            >
              <span>Clear ✕</span>
            </button>
          )}
          <span className="muted font-mono" style={{ fontSize: 11 }} role="status">
            {total != null ? `${logs.length} OF ${total.toLocaleString()} SHOWN` : `${logs.length} SHOWN`}
          </span>
        </div>

        <div style={{ position: "relative", width: 260 }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search actor name, email, entity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
            <Icons.Search size={14} />
          </span>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icons.AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          title="No Audit Records Found"
          description="No operations matching your search or action filter."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredLogs.map((log) => {
            const isExpanded = expandedId === log.id;
            return (
              <div
                key={log.id}
                className="compact-card"
                style={{
                  padding: 14,
                  gap: 10,
                  cursor: "pointer",
                }}
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={`badge ${getActionBadgeColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
                      {log.actor?.name || "System Automated Worker"}
                    </span>
                    {log.actor?.email && (
                      <span className="muted" style={{ fontSize: 12 }}>
                        ({log.actor.email})
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {formatDateTime(log.createdAt)}
                    </span>
                    <span className="badge badge-muted" style={{ fontSize: 11 }}>
                      {log.entityType}: {log.entityId.slice(0, 10)}…
                    </span>
                    <Icons.ChevronDown
                      size={14}
                      style={{
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  </div>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      padding: 12,
                      backgroundColor: "var(--stone)",
                      border: "1px solid var(--stone)",
                      fontSize: 12,
                      fontFamily: "monospace",
                      overflowX: "auto",
                      marginTop: 4,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ marginBottom: 6, fontWeight: 600, color: "var(--ink)" }}>
                      Audit Payload Metadata:
                    </div>
                    <pre style={{ margin: 0 }}>
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
          {total != null && total > 50 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", padding: 12 }}>
              <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
              <span className="muted font-mono" style={{ fontSize: 12 }}>PAGE {page} / {Math.max(1, Math.ceil(total / 50))}</span>
              <button type="button" className="btn btn-secondary" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
