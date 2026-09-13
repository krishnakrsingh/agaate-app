"use client";
import Link from "next/link";
import { Icons } from "./icons";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length <= 1) return null;
  return (
    <nav
      className="breadcrumbs"
      aria-label="Breadcrumb"
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
        fontSize: 13,
        color: "var(--muted)",
        lineHeight: 1.2,
      }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span
            key={`${item.label}-${index}`}
            className="breadcrumb-seg"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {index > 0 && (
              <Icons.ChevronRight
                size={12}
                className="breadcrumb-sep"
                style={{ display: "inline-block", color: "var(--muted-soft)", flexShrink: 0 }}
              />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="breadcrumb-link"
                style={{ color: "var(--muted)", textDecoration: "none" }}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="breadcrumb-current"
                aria-current={isLast ? "page" : undefined}
                style={{ color: "var(--ink)", fontWeight: 500 }}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
