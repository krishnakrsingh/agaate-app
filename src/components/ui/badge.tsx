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
  const pClass = priority.toLowerCase();
  return (
    <span className={`priority-tag ${pClass}`}>
      {priority}
    </span>
  );
}
