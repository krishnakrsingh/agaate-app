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
        background: "var(--card-muted)",
        border: "1px dashed var(--border-strong)",
        borderRadius: "var(--radius-md)",
      }}
    >
      {icon && (
        <div
          style={{
            color: "var(--text-muted)",
            marginBottom: 12,
            width: 48,
            height: 48,
            borderRadius: "var(--radius-full)",
            background: "var(--card)",
            display: "grid",
            placeItems: "center",
            border: "1px solid var(--border)",
          }}
        >
          {icon}
        </div>
      )}
      <strong style={{ fontSize: "1.05rem", color: "var(--text-main)" }}>{title}</strong>
      {description && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: "6px 0 16px", maxWidth: 420 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
