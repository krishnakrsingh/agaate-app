import React from "react";

export function RoleBadge({ role }: { role: string }) {
  const roleLabel = role.replaceAll("_", " ");
  const roleClass = role.toLowerCase();

  return <span className={`role-badge ${roleClass}`}>{roleLabel}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const statusClass = status.toLowerCase();
  const label = status.replaceAll("_", " ");

  return <span className={`status ${statusClass}`}>{label}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const priorityClass = priority.toLowerCase();
  return <span className={`priority-tag ${priorityClass}`}>{priority}</span>;
}
