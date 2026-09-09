"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/icons";
import { FarmSwitcher } from "@/components/nav/farm-switcher";
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
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  // Build role-tailored grouped navigation sections
  const sections: NavSection[] = [];

  if (role === "SUPER_ADMIN") {
    sections.push(
      {
        title: "HQ Command",
        items: [
          {
            href: "/dashboard",
            label: "Command Center",
            icon: "Farm",
            isActive: (p) => p === "/dashboard",
          },
          {
            href: "/farms",
            label: "Farms Directory",
            icon: "Farm",
            isActive: (p) => p === "/farms" || (p.startsWith("/farms/") && !p.startsWith("/farms/new")),
          },
          {
            href: "/clients",
            label: "Clients Directory",
            icon: "Users",
            isActive: (p) => p.startsWith("/clients"),
          },
          {
            href: "/operations/tasks",
            label: "Tasks Queue",
            icon: "ClipboardList",
            isActive: (p) => p.startsWith("/operations/tasks") || p.startsWith("/tasks"),
          },
          {
            href: "/owner/calendar",
            label: "Ops Calendar",
            icon: "Calendar",
          },
        ],
      },
      {
        title: "Client Portfolio",
        items: [
          {
            href: "/farms/new",
            label: "Onboard Client & Farm",
            icon: "Plus",
            badge: "Setup",
            isActive: (p) => p.startsWith("/farms/new"),
          },
          {
            href: "/admin/attendance",
            label: "Workforce Presence",
            icon: "Activity",
          },
          {
            href: "/admin/users",
            label: "Clients & Directory",
            icon: "Users",
          },
        ],
      },
      {
        title: "Governance & Audit",
        items: [
          {
            href: "/admin/approvals",
            label: "Approvals Desk",
            icon: "Shield",
          },
          {
            href: "/admin/audit",
            label: "Audit Trail",
            icon: "FileText",
          },
          {
            href: "/reports/daily",
            label: "Shift Reports",
            icon: "TrendingUp",
          },
        ],
      }
    );
  } else if (role === "FARM_ADMIN") {
    sections.push(
      {
        title: "Estate Operations",
        items: [
          {
            href: "/owner/dashboard",
            label: "Cockpit",
            icon: "Farm",
            isActive: (p) => p.startsWith("/owner/dashboard") || p === "/dashboard",
          },
          {
            href: "/owner/calendar",
            label: "Ops Calendar",
            icon: "Calendar",
          },
          {
            href: "/owner/plots",
            label: "Plots & Crops",
            icon: "TrendingUp",
            isActive: (p) => p.startsWith("/owner/plots") || p.startsWith("/plots"),
          },
          {
            href: "/tasks",
            label: "Field Tasks",
            icon: "ClipboardList",
          },
        ],
      },
      {
        title: "Logistics & Yield",
        items: [
          {
            href: "/owner/harvest",
            label: "Harvest Logistics",
            icon: "Truck",
          },
          {
            href: "/owner/inventory",
            label: "Shed Stock",
            icon: "Package",
          },
          {
            href: "/admin/attendance",
            label: "Workforce Presence",
            icon: "Activity",
          },
          {
            href: "/owner/team",
            label: "Laborers & Team",
            icon: "Users",
          },
        ],
      },
      {
        title: "Finance & Insights",
        items: [
          {
            href: "/owner/financials",
            label: "Financials & P&L",
            icon: "Coins",
          },
          {
            href: "/owner/reports/brief",
            label: "Executive Brief",
            icon: "FileText",
            badge: "PDF",
          },
          {
            href: "/reports/daily",
            label: "Daily Reports",
            icon: "Calendar",
          },
        ],
      }
    );
  } else if (role === "FARM_OFFICER") {
    sections.push(
      {
        title: "Duty & Operations",
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
        title: "Field Tracking & Logs",
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
      title: "Agronomy Suite",
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
      {/* 1. Header: Brand, Estate Switcher, Quick Action Search */}
      <div className="sidebar-header">
        <div className="sidebar-brand-row">
          <Link href={homeHref} className="sidebar-brand" aria-label="Agaate Precision Home">
            <BrandLogo height={27} priority />
            <span className="sidebar-brand-tag">OPS</span>
          </Link>
          <span className="sidebar-role-badge">
            {role === "SUPER_ADMIN" ? "HQ" : "ESTATE"}
          </span>
        </div>

        {/* Estate Switcher Instrument */}
        <div className="sidebar-switcher">
          <FarmSwitcher />
        </div>

        {/* Quick ⌘K Command Finder Trigger */}
        {onOpenCommandPalette && (
          <button
            type="button"
            className="sidebar-search-btn"
            onClick={onOpenCommandPalette}
            title="Search estates, navigation & actions (⌘K / Ctrl+K)"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icons.Search size={13} />
              <span>Quick Action...</span>
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
        {/* Telemetry Status Line */}
        <div className="sidebar-telemetry-row">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span className="telemetry-live-dot" />
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em" }}>SYS LIVE</span>
          </span>
          {timeStr && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }} suppressHydrationWarning>
              {timeStr}
            </span>
          )}
        </div>

        {/* User Session Card */}
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
