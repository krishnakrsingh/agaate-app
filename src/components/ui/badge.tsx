import React from "react";

export function RoleBadge({ role }: { role: string }) {
  const roleLabel = role.replaceAll("_", " ");
  const normalized = role.toUpperCase().replace(/[\s_-]+/g, "_");

  let colorClass = "";
  if (normalized === "SUPER_ADMIN") colorClass = "role-super-admin";
  else if (normalized === "OPERATIONS_MANAGER") colorClass = "role-operations-manager";
  else if (normalized === "AGRONOMIST") colorClass = "role-agronomist";
  else if (normalized === "FARM_ADMIN") colorClass = "role-farm-admin";
  else if (normalized.includes("ADMIN")) colorClass = "role-farm-admin";
  else if (normalized.includes("OFFICER")) colorClass = "role-farm-officer";

  return <span className={`role-badge ${colorClass}`.trim()}>{roleLabel}</span>;
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
