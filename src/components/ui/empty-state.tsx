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
        backgroundColor: "var(--canvas)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {icon && (
        <div
          style={{
            color: "var(--muted)",
            marginBottom: 12,
            width: 44,
            height: 44,
            borderRadius: "var(--radius-xs)",
            backgroundColor: "var(--stone)",
            display: "grid",
            placeItems: "center",
            border: "1px solid var(--line)",
          }}
        >
          {icon}
        </div>
      )}
      <strong style={{ fontSize: "16px", fontWeight: 550, color: "var(--ink)" }}>{title}</strong>
      {description && (
        <p style={{ color: "var(--muted)", fontSize: "13px", margin: "6px 0 16px", maxWidth: 440 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}
