"use client";
import { useEffect, useState, useMemo } from "react";
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

export function AuditConsole() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/audit-logs?limit=100");
      if (!res.ok) throw new Error("Could not load system audit records.");
      const data = await res.json();
      setLogs(data || []);
    } catch (err: any) {
      setError(err.message || "Network error loading audit trail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs();
  }, []);

  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    for (const log of logs) {
      set.add(log.action);
    }
    return Array.from(set);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchAction = actionFilter === "ALL" || log.action === actionFilter;
      const matchSearch =
        !search ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.entityType.toLowerCase().includes(search.toLowerCase()) ||
        (log.actor?.name && log.actor.name.toLowerCase().includes(search.toLowerCase())) ||
        (log.actor?.email && log.actor.email.toLowerCase().includes(search.toLowerCase()));
      return matchAction && matchSearch;
    });
  }, [logs, actionFilter, search]);

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
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ width: 200, padding: "6px 10px", fontSize: 13 }}
            >
              <option value="ALL">All Actions ({logs.length})</option>
              {actionTypes.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={fetchLogs}
            title="Refresh Audit Trail"
          >
            <Icons.Refresh size={14} />
            <span>Sync</span>
          </button>
        </div>

        <div style={{ position: "relative", width: 260 }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search actor or entity…"
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
        </div>
      )}
    </div>
  );
}
