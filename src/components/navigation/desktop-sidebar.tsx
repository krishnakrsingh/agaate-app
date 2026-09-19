"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icons } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_LABELS, ROLE_HOME_URLS } from "@/components/navigation/config";
import { BrandLogo } from "@/components/navigation/brand-logo";
import { AccountPopover } from "@/components/navigation/account-popover";

function getInitials(name: string | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].charAt(0).toUpperCase();
}

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
  const [accountOpen, setAccountOpen] = useState(false);
  const [displayName, setDisplayName] = useState(userName ?? "Console User");
  const sidebarRef = useRef<HTMLElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userName) setDisplayName(userName);
  }, [userName]);

  useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ name?: string }>;
      if (customEvent.detail?.name) {
        setDisplayName(customEvent.detail.name);
      }
    };
    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, []);

  const toggleAccount = useCallback(() => setAccountOpen((v) => !v), []);

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
    setAccountOpen(false);
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

  const [unread, setUnread] = useState<number>(0);
  useEffect(() => {
    if (role !== "AGRONOMIST" && role !== "FARM_OFFICER") return;
    let alive = true;
    const load = () => {
      fetch("/api/notifications/unread-count")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && typeof d?.count === "number") setUnread(d.count);
        })
        .catch(() => { /* badges are best-effort */ });
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [role]);
  const chatBadge = unread > 0 ? (unread > 99 ? "99+" : String(unread)) : undefined;

  if (role === "SUPER_ADMIN") {
    sections.push(
      {
        title: "PORTFOLIO",
        items: [
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
        title: "INTAKE & TEAM",
        items: [
          {
            href: "/hq/onboarding",
            label: "Onboarding",
            icon: "Zap",
            isActive: (p) => p.startsWith("/hq/onboarding") || p.startsWith("/onboarding"),
          },
          {
            href: "/hq/people",
            label: "Internal Team",
            icon: "Shield",
            isActive: (p) => p.startsWith("/hq/people") || p.startsWith("/people"),
          },
          {
            href: "/hq/agronomists",
            label: "Agronomists",
            icon: "Stethoscope",
            isActive: (p) => p.startsWith("/hq/agronomists"),
          },
        ],
      }
    );
  } else if (role === "FARM_ADMIN") {
    sections.push(
      {
        title: "PORTFOLIO & CROPS",
        items: [
          {
            href: "/owner/farms",
            label: "Farm Estates",
            icon: "Farm",
            isActive: (p) => p.startsWith("/owner/farms") || p === "/owner/farm",
          },
          {
            href: "/owner/crops",
            label: "Crop Cycles",
            icon: "TrendingUp",
            isActive: (p) => p.startsWith("/owner/crops"),
          },
        ],
      },
      {
        title: "OPERATIONS & COMMS",
        items: [
          {
            href: "/owner/operations",
            label: "Operations & Tasks",
            icon: "ClipboardList",
            isActive: (p) => p.startsWith("/owner/operations") || p.startsWith("/owner/calendar") || p.startsWith("/tasks"),
          },
          {
            href: "/owner/chat",
            label: "Agronomy & Team Chat",
            icon: "Users",
            badge: chatBadge,
            isActive: (p) => p.startsWith("/owner/chat"),
          },
          {
            href: "/owner/people",
            label: "Team Management",
            icon: "Shield",
            isActive: (p) => p.startsWith("/owner/people") || p.startsWith("/owner/team"),
          },
        ],
      }
    );
  } else if (role === "AGRONOMIST") {
    sections.push(
      {
        title: "FIELD INTELLIGENCE",
        items: [
          {
            href: "/agronomy/chat",
            label: "Field Messages & Intel",
            icon: "Users",
            badge: chatBadge,
            isActive: (p) => p.startsWith("/agronomy/chat") || p.startsWith("/agronomy"),
          },
          {
            href: "/tasks",
            label: "Tasks Ledger",
            icon: "ClipboardList",
            isActive: (p) => p.startsWith("/tasks"),
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
          href: "/officer/chat",
          label: "Ask Agronomist",
          icon: "Users",
          badge: chatBadge,
          isActive: (p) => p.startsWith("/officer/chat"),
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
      title: "FIELD OPERATIONS",
      items: [
        {
          href: "/agronomy/chat",
          label: "Field Messages",
          icon: "Users",
          badge: chatBadge,
          isActive: (p) => p.startsWith("/agronomy/chat"),
        },
        {
          href: "/tasks",
          label: "Tasks Ledger",
          icon: "ClipboardList",
        },
      ],
    });
  }

  const initials = displayName ? getInitials(displayName) : "U";
  const userRoleLabel = ROLE_LABELS[role] ?? role.replaceAll("_", " ");
  const homeHref = ROLE_HOME_URLS[role] ?? "/";

  return (
    <aside
      ref={sidebarRef}
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
          <div
            className="sidebar-user-card"
            ref={anchorRef}
            onClick={toggleAccount}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleAccount(); } }}
          >
            <div className="sidebar-user-info">
              <div className="sidebar-user-avatar" aria-hidden>{initials}</div>
              <div className="sidebar-user-text">
                <span className="sidebar-user-name" title={displayName}>
                  {displayName}
                </span>
                <span className="sidebar-user-role">{userRoleLabel}</span>
              </div>
            </div>
            <div className="sidebar-user-actions">
              <span className="sidebar-expand-icon">
                <Icons.ChevronUp
                  size={14}
                  style={{
                    transform: accountOpen ? "rotate(0deg)" : "rotate(180deg)",
                    transition: "transform 0.15s ease",
                  }}
                />
              </span>
            </div>
            <AccountPopover
              open={accountOpen}
              onToggle={toggleAccount}
              userName={displayName}
              userRole={role}
              anchorRef={anchorRef}
            />
          </div>
        ) : (
          <div className="sidebar-rail-stack">
            {/* User Avatar — Clickable to open account popover */}
            <div
              className="sidebar-rail-btn sidebar-rail-avatar-btn"
              ref={anchorRef}
              tabIndex={0}
              aria-label={`Account menu for ${displayName}`}
              role="button"
              onClick={toggleAccount}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleAccount(); } }}
            >
              <div className="sidebar-user-avatar" style={{ width: 34, height: 34 }}>
                {initials}
              </div>
              <span className="sidebar-tooltip">
                {displayName} ({userRoleLabel})
              </span>
              <AccountPopover
                open={accountOpen}
                onToggle={toggleAccount}
                userName={displayName}
                userRole={role}
                anchorRef={anchorRef}
                isRail={true}
              />
            </div>

            {/* Theme Toggle Button with Tooltip */}
            <div className="sidebar-rail-btn" style={{ padding: 0 }}>
              <ThemeToggle variant="button" />
              <span className="sidebar-tooltip">Toggle theme</span>
            </div>

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
