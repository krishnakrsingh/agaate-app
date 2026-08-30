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
        padding: "40px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--soft-stone)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {icon && <div style={{ color: "var(--slate)", marginBottom: 10 }}>{icon}</div>}
      <strong style={{ fontSize: 15, color: "var(--ink)" }}>{title}</strong>
      {description && (
        <p style={{ color: "var(--body-muted)", fontSize: 13, margin: "4px 0 12px", maxWidth: 420 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}
