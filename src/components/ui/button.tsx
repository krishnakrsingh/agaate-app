"use client";
import React from "react";

type Variant = "primary" | "green" | "secondary" | "ghost" | "danger" | "outline" | "link";
type Size = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  const cls = `btn btn-${variant} btn-${size} ${className}`.trim();
  return <button className={cls} {...props} />;
}
