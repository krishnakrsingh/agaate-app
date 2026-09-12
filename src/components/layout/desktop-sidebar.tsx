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
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved === "true") {
        setCollapsed(true);
        document.documentElement.setAttribute("data-sidebar-collapsed", "true");
      }
    } catch {
      // ignore
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((prev) => {
          const next = !prev;
          try {
            localStorage.setItem("sidebar-collapsed", String(next));
            if (next) {
              document.documentElement.setAttribute("data-sidebar-collapsed", "true");
            } else {
              document.documentElement.removeAttribute("data-sidebar-collapsed");
            }
          } catch {
            // ignore
          }
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar-collapsed", String(next));
        if (next) {
          document.documentElement.setAttribute("data-sidebar-collapsed", "true");
        } else {
          document.documentElement.removeAttribute("data-sidebar-collapsed");
        }
      } catch {
        // ignore
      }
      return next;
    });
  };

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
        title: "SETTINGS & CONFIG",
        items: [
          {
            href: "/owner/settings",
            label: "Estate Settings",
            icon: "Settings",
            isActive: (p) => p.startsWith("/owner/settings"),
          },
        ],
      }
    );
  } else if (role === "AGRONOMIST") {
    sections.push(
      {
        title: "RADAR & PROTOCOLS",
        items: [
          {
            href: "/agronomy/radar",
            label: "Clinical Radar",
            icon: "Activity",
            isActive: (p) => p.startsWith("/agronomy/radar") || p === "/agronomy",
          },
          {
            href: "/agronomy/prescriptions",
            label: "Rx Directives",
            icon: "FileText",
            isActive: (p) => p.startsWith("/agronomy/prescriptions"),
          },
          {
            href: "/agronomy/protocols",
            label: "Stage Rules",
            icon: "Sprout",
            isActive: (p) => p.startsWith("/agronomy/protocols"),
          },
        ],
      },
      {
        title: "DIAGNOSTICS & TELEMETRY",
        items: [
          {
            href: "/spatial",
            label: "GIS Boundary Audit",
            icon: "Compass",
            isActive: (p) => p.startsWith("/spatial"),
          },
          {
            href: "/sensor-network",
            label: "Sensor Hub",
            icon: "Droplet",
            isActive: (p) => p.startsWith("/sensor-network") || p.startsWith("/sensors"),
          },
        ],
      }
    );
  } else if (role === "FARM_OFFICER") {
    sections.push({
      title: "DAILY OPERATIONS",
      items: [
        {
          href: "/officer/day",
          label: "My Day",
          icon: "Calendar",
          isActive: (p) => p.startsWith("/officer/day"),
        },
        {
          href: "/tasks",
          label: "Tasks Ledger",
          icon: "ClipboardList",
        },
      ],
    });
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
    <aside
      className={`app-desktop-sidebar ${collapsed ? "collapsed" : ""}`}
      aria-label="Desktop Application Sidebar"
    >
      {/* 1. Header: Brand & Collapse Toggle */}
      <div className="sidebar-header">
        {!collapsed ? (
          <>
            <Link href={homeHref} className="sidebar-brand" aria-label="Agaate Precision Home">
              <BrandLogo variant="full" height={30} priority />
            </Link>
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={toggleCollapse}
              title="Collapse sidebar (⌘B)"
              aria-label="Collapse sidebar"
            >
              <Icons.PanelLeftClose size={15} />
            </button>
          </>
        ) : (
          <Link
            href={homeHref}
            className="sidebar-brand"
            aria-label="Agaate Precision Home"
            title="Agaate Home"
          >
            <BrandLogo variant="mark" height={32} priority />
          </Link>
        )}
      </div>

      {/* 2. Navigation Container */}
      <div className="sidebar-nav-container">
        {sections.map((sec, secIdx) => (
          <div key={sec.title} className="sidebar-nav-section">
            {!collapsed ? (
              <div className="sidebar-section-title">{sec.title}</div>
            ) : (
              secIdx > 0 && <div className="sidebar-rail-divider" />
            )}

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
                      <Icon size={18} />
                    </span>
                    {!collapsed && <span className="sidebar-label">{item.label}</span>}
                  </span>
                  {!collapsed && item.badge && (
                    <span className="sidebar-badge">{item.badge}</span>
                  )}
                  {collapsed && (
                    <span className="sidebar-tooltip">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* 3. Footer */}
      <div className="sidebar-footer">
        {!collapsed ? (
          <>
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
                <ThemeToggle variant="switch" />
                <button
                  type="button"
                  className="sidebar-logout-btn"
                  onClick={handleSignOut}
                  title="Sign Out of Session"
                >
                  <Icons.LogOut size={14} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="sidebar-rail-stack">
            {/* User Avatar with Tooltip */}
            <div
              className="sidebar-rail-btn"
              style={{ cursor: "default" }}
              tabIndex={0}
              aria-label={userName ?? "Console User"}
            >
              <div className="sidebar-user-avatar" style={{ width: 34, height: 34 }}>
                {initials}
              </div>
              <span className="sidebar-tooltip">
                {userName ?? "Console User"} ({userRoleLabel})
              </span>
            </div>

            {/* Theme Toggle Button with Tooltip */}
            <div className="sidebar-rail-btn" style={{ padding: 0 }}>
              <ThemeToggle variant="button" />
              <span className="sidebar-tooltip">Toggle theme</span>
            </div>

            {/* Sign Out Button with Tooltip */}
            <button
              type="button"
              className="sidebar-rail-btn"
              onClick={handleSignOut}
              aria-label="Sign out"
            >
              <Icons.LogOut size={16} />
              <span className="sidebar-tooltip">Sign Out</span>
            </button>

            {/* Expand Rail Button with Tooltip */}
            <button
              type="button"
              className="sidebar-rail-btn"
              onClick={toggleCollapse}
              aria-label="Expand sidebar"
            >
              <Icons.PanelLeftOpen size={17} />
              <span className="sidebar-tooltip">Expand sidebar (⌘B)</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
