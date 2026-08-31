import React, { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--dark-surface)",
        border: "1px solid var(--border-card)",
        borderRadius: "var(--radius-sm)",
        boxShadow: "var(--shadow-subtle)",
      }}
    >
      {icon && <div style={{ color: "var(--text-secondary)", marginBottom: 12 }}>{icon}</div>}
      <strong style={{ fontSize: 16, color: "var(--text-light)" }}>{title}</strong>
      {description && (
        <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "6px 0 16px", maxWidth: 420 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
