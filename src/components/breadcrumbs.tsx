"use client";
import Link from "next/link";
import { Icons } from "./icons";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null;
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="breadcrumb-seg">
            {index > 0 && <Icons.ChevronRight size={12} className="breadcrumb-sep" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="breadcrumb-link">
                {item.label}
              </Link>
            ) : (
              <span className="breadcrumb-current" aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
