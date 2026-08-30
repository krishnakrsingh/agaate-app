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
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <strong style={{ fontSize: "1rem", color: "var(--text-main)" }}>{title}</strong>
      {description && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "2px 0 8px", maxWidth: 420 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
