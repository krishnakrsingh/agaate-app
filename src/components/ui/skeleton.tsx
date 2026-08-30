import React from "react";

export function Skeleton({
  width,
  height,
  borderRadius,
  className = "",
  style,
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? "1rem",
        borderRadius: borderRadius ?? "var(--radius-sm)",
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton width="40%" height={24} />
        <Skeleton width={60} height={20} borderRadius="var(--radius-full)" />
      </div>
      <Skeleton width="70%" height={16} />
      <Skeleton width="100%" height={40} />
    </div>
  );
}
