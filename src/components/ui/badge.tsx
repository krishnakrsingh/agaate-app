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
        padding: "3px 10px",
        borderRadius: "var(--radius-full)",
        background: isUrgent
          ? "var(--negative-red-tint)"
          : isHigh
          ? "var(--warning-orange-tint)"
          : "var(--mid-dark)",
        color: isUrgent
          ? "var(--negative-red)"
          : isHigh
          ? "var(--warning-orange)"
          : "var(--text-secondary)",
        border: `1px solid ${
          isUrgent
            ? "rgba(243, 114, 127, 0.3)"
            : isHigh
            ? "rgba(255, 164, 43, 0.3)"
            : "var(--border-subtle)"
        }`,
      }}
    >
      {priority}
    </span>
  );
}
