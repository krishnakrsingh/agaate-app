import React from "react";

export function RoleBadge({ role }: { role: string }) {
  const roleLabel = role.replaceAll("_", " ");
  return <span className="role-badge">{roleLabel}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const statusClass = status.toLowerCase();
  const label = status.replaceAll("_", " ");

  return <span className={`status ${statusClass}`}>{label}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const isUrgent = priority === "URGENT";
  const isHigh = priority === "HIGH";

  return (
    <span
      className="mono-label"
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: "var(--radius-xs)",
        background: isUrgent ? "#fff5f5" : isHigh ? "var(--soft-stone)" : "var(--canvas)",
        color: isUrgent ? "var(--error)" : isHigh ? "var(--ink)" : "var(--slate)",
        border: `1px solid ${isUrgent ? "#fed7d7" : "var(--hairline)"}`,
      }}
    >
      {priority}
    </span>
  );
}
