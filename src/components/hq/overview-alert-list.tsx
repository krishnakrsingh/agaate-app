"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type OverviewAlert = {
  id: string;
  type: string;
  severity: string;
  description?: string;
  farmId: string;
  farmName: string;
  clientName: string;
  status: string;
  when: string;
};

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function severityClass(severity: string) {
  if (severity === "CRITICAL") return "badge badge-danger";
  if (severity === "HIGH") return "badge badge-amber";
  if (severity === "MEDIUM") return "badge badge-blue";
  return "badge";
}

export function OverviewAlertList({ alerts }: { alerts: OverviewAlert[] }) {
  const [sort, setSort] = useState<"severity" | "newest">("severity");
  const sorted = useMemo(() => {
    const copy = [...alerts];
    if (sort === "severity") {
      copy.sort(
        (a, b) => (SEVERITY_RANK[a.severity] ?? 4) - (SEVERITY_RANK[b.severity] ?? 4) || b.when.localeCompare(a.when)
      );
    } else {
      copy.sort((a, b) => b.when.localeCompare(a.when));
    }
    return copy;
  }, [alerts, sort]);

  if (alerts.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No open alerts</div>
        <div className="empty-state-desc">New field incidents needing triage will appear here.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="tabs-nav" role="tablist" aria-label="Sort alerts" style={{ marginBottom: 12 }}>
        {(["severity", "newest"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={sort === option}
            className={`tab-btn ${sort === option ? "active" : ""}`}
            onClick={() => setSort(option)}
          >
            {option === "severity" ? "Severity first" : "Newest first"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((alert) => (
          <div
            key={alert.id}
            className="data-row"
            style={{
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--hairline)",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
                  {alert.type}
                </span>
                <span className={severityClass(alert.severity)}>{alert.severity}</span>
                <span className="badge" style={{ fontSize: 11 }}>{alert.status}</span>
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
                <Link
                  href={`/hq/farms/${alert.farmId}`}
                  style={{ textDecoration: "none", color: "inherit", fontWeight: 500 }}
                  className="hover-underline"
                >
                  {alert.farmName}
                </Link>
                {" "}&middot; {alert.clientName} &middot; Reported {alert.when}
              </div>
              {alert.description && (
                <div style={{ fontSize: 13, color: "var(--body)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {alert.description}
                </div>
              )}
            </div>
            <div style={{ flexShrink: 0 }}>
              <Link
                href={`/hq/farms/${alert.farmId}?tab=incidents`}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 12, padding: "5px 12px", whiteSpace: "nowrap" }}
              >
                Triage Farm &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
