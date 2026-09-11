"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_LABELS, ROLE_HOME_URLS } from "@/components/nav/config";
import { BrandLogo } from "@/components/brand-logo";

interface NavLinkItem {
  href: string;
  label: string;
  icon: keyof typeof Icons;
  badge?: string;
  isActive?: (path: string) => boolean;
}

interface NavSection {
  title: string;
  items: NavLinkItem[];
}

interface DesktopSidebarProps {
  role: string;
  userName?: string;
  onOpenCommandPalette?: () => void;
}

export function DesktopSidebar({ role, userName, onOpenCommandPalette }: DesktopSidebarProps) {
  const pathname = usePathname();

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  // Build role-tailored grouped navigation sections
  const sections: NavSection[] = [];

  const [counts, setCounts] = useState<{ inbox?: number; onboarding?: number; missingBoundary?: number } | null>(null);

  useEffect(() => {
    if (role !== "SUPER_ADMIN") return;
    fetch("/api/admin/counts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setCounts(d);
      })
      .catch(() => { /* badges are best-effort */ });
  }, [role]);

  if (role === "SUPER_ADMIN") {
    sections.push(
      {
        title: "PORTFOLIO",
        items: [
          {
            href: "/hq",
            label: "Overview",
            icon: "Activity",
            badge: counts?.inbox ? String(counts.inbox > 99 ? "99+" : counts.inbox) : undefined,
            isActive: (p) => p === "/hq" || p === "/dashboard" || p === "/operations",
          },
          {
            href: "/hq/clients",
            label: "Clients",
            icon: "Users",
            isActive: (p) => p.startsWith("/hq/clients") || p.startsWith("/clients"),
          },
          {
            href: "/hq/farms",
            label: "Farms",
            icon: "Farm",
            badge: counts?.missingBoundary ? `${counts.missingBoundary} no map` : undefined,
            isActive: (p) => p.startsWith("/hq/farms") || p.startsWith("/farms"),
          },
        ],

      },
      {
        title: "INTAKE & WORKFORCE",
        items: [
          {
            href: "/hq/onboarding",
            label: "Onboarding",
            icon: "Zap",
            badge: counts?.onboarding ? String(counts.onboarding > 99 ? "99+" : counts.onboarding) : undefined,
            isActive: (p) => p.startsWith("/hq/onboarding") || p.startsWith("/onboarding"),
          },
          {
            href: "/hq/people",
            label: "People",
            icon: "User",
            isActive: (p) => p.startsWith("/hq/people") || p.startsWith("/people") || p.startsWith("/attendance"),
          },
        ],
      }
    );
  } else if (role === "FARM_ADMIN") {
    sections.push(
      {
        title: "ESTATE",
        items: [
          {
            href: "/owner/dashboard",
            label: "Home / Cockpit",
            icon: "Farm",
            isActive: (p) => p === "/owner/dashboard" || p === "/dashboard",
          },
          {
            href: "/owner/farm",
            label: "My Farm",
            icon: "Plot",
            isActive: (p) => p.startsWith("/owner/farm"),
          },
          {
            href: "/owner/land",
            label: "Land & Plots",
            icon: "TrendingUp",
            isActive: (p) => p.startsWith("/owner/land") || p.startsWith("/owner/plots") || p.startsWith("/plots"),
          },
        ],
      },
      {
        title: "EXECUTION",
        items: [
          {
            href: "/owner/operations",
            label: "Operations",
            icon: "ClipboardList",
            isActive: (p) => p.startsWith("/owner/operations") || p.startsWith("/tasks"),
          },
          {
            href: "/owner/people",
            label: "People & Labor",
            icon: "Users",
            isActive: (p) => p.startsWith("/owner/people") || p.startsWith("/owner/team") || p.startsWith("/admin/attendance"),
          },
          {
            href: "/owner/records",
            label: "Logistics & Records",
            icon: "Truck",
            isActive: (p) => p.startsWith("/owner/records") || p.startsWith("/owner/harvest") || p.startsWith("/owner/inventory") || p.startsWith("/owner/financials"),
          },
        ],
      },
      {
        title: "INTELLIGENCE",
        items: [
          {
            href: "/owner/insights",
            label: "Farm Insights",
            icon: "Activity",
            isActive: (p) => p.startsWith("/owner/insights") || p.startsWith("/owner/reports"),
          },
          {
            href: "/owner/settings",
            label: "Settings",
            icon: "Settings",
            isActive: (p) => p.startsWith("/owner/settings"),
          },
        ],
      }
    );
  } else if (role === "FARM_OFFICER") {
    sections.push(
      {
        title: "DUTY & OPERATIONS",
        items: [
          {
            href: "/officer/day",
            label: "Daily Tasks",
            icon: "Sun",
            badge: "Live",
            isActive: (p) => p.startsWith("/officer/day") || p.startsWith("/field/today"),
          },
          {
            href: "/officer/reports",
            label: "Incidents & Signals",
            icon: "AlertTriangle",
            isActive: (p) => p.startsWith("/officer/reports"),
          },
        ],
      },
      {
        title: "FIELD TRACKING",
        items: [
          {
            href: "/officer/harvest",
            label: "Harvest Logger",
            icon: "Truck",
          },
          {
            href: "/officer/crew",
            label: "Crew Muster",
            icon: "Users",
          },
          {
            href: "/officer/quick-log",
            label: "Quick Event Log",
            icon: "Zap",
          },
          {
            href: "/officer/boundary",
            label: "Boundary Walk",
            icon: "Navigation",
            isActive: (p) => p.startsWith("/officer/boundary"),
          },
          {
            href: "/officer/profile",
            label: "Officer Profile",
            icon: "User",
            isActive: (p) => p.startsWith("/officer/profile"),
          },
        ],
      }
    );
  } else {
    // Default / Agronomist fallback
    sections.push({
      title: "AGRONOMY SUITE",
      items: [
        {
          href: "/agronomy/radar",
          label: "Crop Radar",
          icon: "TrendingUp",
          isActive: (p) => p.startsWith("/agronomy/radar") || p === "/dashboard",
        },
        {
          href: "/agronomy/planning",
          label: "Weekly Plan",
          icon: "Calendar",
        },
        {
          href: "/agronomy/diagnostics",
          label: "Diagnostics",
          icon: "Stethoscope",
        },
        {
          href: "/tasks",
          label: "Tasks Ledger",
          icon: "ClipboardList",
        },
        {
          href: "/reports/daily",
          label: "Field Reports",
          icon: "FileText",
        },
      ],
    });
  }

  const initials = userName ? userName.trim().charAt(0).toUpperCase() : "U";
  const userRoleLabel = ROLE_LABELS[role] ?? role.replaceAll("_", " ");
  const homeHref = ROLE_HOME_URLS[role] ?? "/";

  return (
    <aside className="app-desktop-sidebar" aria-label="Desktop Application Sidebar">
      {/* 1. Header: Brand, Switcher, Quick Action Search */}
      <div className="sidebar-header">
        <div className="sidebar-brand-row">
          <Link href={homeHref} className="sidebar-brand" aria-label="Agaate Precision Home">
            <BrandLogo height={27} priority />
          </Link>
          <span className="sidebar-role-badge">
            {role === "SUPER_ADMIN" ? "HQ" : "ESTATE"}
          </span>
        </div>

        {/* Farm finder. There is deliberately NO estate dropdown here:
            a 25-row menu cannot serve 1,00,000+ farms. Farm-finding lives in
            the ⌘K palette (server search) + Unified Directory (faceted). */}
        {onOpenCommandPalette && (
          <button
            type="button"
            className="sidebar-search-btn"
            onClick={onOpenCommandPalette}
            title="Find a farm, client, task… (⌘K / Ctrl+K)"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Icons.MapPin size={14} />
              <span>Find a farm…</span>
            </span>
            <kbd className="sidebar-search-badge">⌘K</kbd>
          </button>
        )}
      </div>

      {/* 2. Navigation Container */}
      <div className="sidebar-nav-container">
        {sections.map((sec) => (
          <div key={sec.title} className="sidebar-nav-section">
            <div className="sidebar-section-title">{sec.title}</div>
            {sec.items.map((item) => {
              const active = item.isActive
                ? item.isActive(pathname)
                : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
              const Icon = Icons[item.icon] ?? Icons.Layers;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-link ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="sidebar-link-main">
                    <span className="sidebar-icon">
                      <Icon size={16} />
                    </span>
                    <span className="sidebar-label">{item.label}</span>
                  </span>
                  {item.badge && (
                    <span className="sidebar-badge">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* 3. Footer: Telemetry Clock, Profile, Theme Toggle & Sign Out */}
      <div className="sidebar-footer">
        <div className="sidebar-telemetry-row">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span className="telemetry-live-dot" />
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em" }}>SYS LIVE</span>
          </span>
        </div>

        <div className="sidebar-user-card">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar" aria-hidden>{initials}</div>
            <div className="sidebar-user-text">
              <span className="sidebar-user-name" title={userName ?? "Console User"}>
                {userName ?? "Console User"}
              </span>
              <span className="sidebar-user-role">{userRoleLabel}</span>
            </div>
          </div>

          <div className="sidebar-user-actions">
            <ThemeToggle />
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={handleSignOut}
              title="Sign Out of Session"
            >
              <Icons.LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
