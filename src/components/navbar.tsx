"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icons } from "./icons";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";

export function Navbar({ role, userName }: { role: string; userName?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isFarmAdmin = role === "FARM_ADMIN";
  const isAgronomist = role === "AGRONOMIST";
  const isOfficer = role === "FARM_OFFICER";
  const canManage = isSuperAdmin || isFarmAdmin;
  const canPlan = isSuperAdmin || isAgronomist;
  const canExecute = isSuperAdmin || isOfficer;

  const primaryLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Icons.Farm, show: true },
    { href: "/farms/new", label: "New Farm", icon: Icons.Plus, show: canManage },
    { href: "/tasks", label: "Activities", icon: Icons.ClipboardList, show: canPlan || isFarmAdmin || isSuperAdmin },
    { href: "/officer/day", label: "My Day", icon: Icons.Sun, show: canExecute, active: pathname.startsWith("/officer/day") },
    { href: "/reports/daily", label: "Daily Report", icon: Icons.FileText, show: true },
  ].filter((l) => l.show).slice(0, 5);

  const secondaryLinks = [
    { href: "/tasks/new", label: "Plan Agronomy", icon: Icons.Calendar, show: canPlan },
    { href: "/officer/reports", label: "Crop Monitoring & Incidents", icon: Icons.Camera, show: canExecute },
    { href: "/admin/approvals", label: "Exception Approvals", icon: Icons.Shield, show: isSuperAdmin || isFarmAdmin },
    { href: "/admin/users", label: "Manage Users", icon: Icons.Users, show: isSuperAdmin },
  ].filter((l) => l.show);

  const roleLabel = role.replaceAll("_", " ");

  return (
    <>
      {/* 36px Black Announcement Bar per Cohere Design */}
      <div className="announcement-bar">
        <span style={{ opacity: 0.9 }}>Agaate Intelligence • Multi-Farm Precision Operating System</span>
        <span style={{ opacity: 0.4, margin: "0 8px" }}>—</span>
        <Link href="/reports/daily" style={{ color: "var(--on-dark)", textDecoration: "underline", textUnderlineOffset: 3 }}>
          View daily telemetry →
        </Link>
      </div>

      <header className="app-navbar">
        <div className="navbar-inner">
          {/* Zone 1: Brand Anchor */}
          <Link href="/dashboard" className="navbar-brand">
            <div className="brand-icon">
              <Icons.Sprout size={16} />
            </div>
            <span>AGAATE</span>
          </Link>

          {/* Zone 2: Primary Rule-Aligned Navigation */}
          <nav aria-label="Primary" className="desktop-nav" style={{ justifyContent: "center", display: "flex" }}>
            <ul className="navbar-nav">
              {primaryLinks.map((l) => {
                const active = l.active ?? (pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href)));
                return (
                  <li key={l.href}>
                    <Link href={l.href} className={`nav-link ${active ? "active" : ""}`}>
                      <l.icon size={14} />
                      <span>{l.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Zone 3: Persona Chip, Menu & Primary Pill Action */}
          <div className="navbar-actions">
            <div className="user-profile-badge" title={`Signed in as ${userName}`}>
              <div className="user-avatar">{userName ? userName.charAt(0).toUpperCase() : "U"}</div>
              <span className="mono-label" style={{ color: "var(--ink)", fontWeight: 600 }}>
                {roleLabel}
              </span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--spotify-green)", boxShadow: "0 0 6px rgba(30, 215, 96, 0.6)" }} />
              {userName && (
                <span style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userName}
                </span>
              )}
            </div>

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Menu Drawer Toggle */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-label="Open menu"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-circle)",
                  background: menuOpen ? "var(--surface-hover)" : "var(--mid-dark)",
                  color: "var(--text-base)",
                  border: "1px solid var(--border-subtle)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <Icons.Layers size={15} />
              </button>

              {menuOpen && (
                <div
                  onMouseLeave={() => setMenuOpen(false)}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    background: "var(--dark-surface)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "var(--radius-sm)",
                    padding: 8,
                    minWidth: 230,
                    boxShadow: "var(--shadow-heavy)",
                    zIndex: 50,
                    display: "grid",
                    gap: 2,
                  }}
                >
                  <div style={{ padding: "8px 12px 10px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div className="mono-label" style={{ color: "var(--text-base)" }}>
                      {roleLabel}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      {userName}
                    </div>
                  </div>

                  {secondaryLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setMenuOpen(false)}
                      className="nav-link"
                      style={{
                        justifyContent: "flex-start",
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: 13,
                        borderRadius: "var(--radius-xs)",
                      }}
                    >
                      <l.icon size={14} />
                      <span>{l.label}</span>
                    </Link>
                  ))}

                  <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />
                  <ThemeToggle variant="menu-item" />
                  <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />
                  <div style={{ padding: "4px 6px" }}>
                    <LogoutButton variant="menu" />
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Direct Sign Out Button */}
            <div className="desktop-signout" style={{ display: "inline-flex" }}>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Dock */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <div className="mobile-nav-inner">
          <Link href="/dashboard" className={`mobile-nav-item ${pathname === "/dashboard" ? "active" : ""}`}>
            <Icons.Farm size={18} />
            <span>Home</span>
          </Link>
          {canExecute && (
            <Link href="/officer/day" className={`mobile-nav-item ${pathname.startsWith("/officer/day") ? "active" : ""}`}>
              <Icons.Sun size={18} />
              <span>My Day</span>
            </Link>
          )}
          {canPlan && !isOfficer && (
            <Link href="/tasks/new" className={`mobile-nav-item ${pathname.startsWith("/tasks/new") ? "active" : ""}`}>
              <Icons.Calendar size={18} />
              <span>Plan</span>
            </Link>
          )}
          {(isFarmAdmin || isSuperAdmin) && !canExecute && (
            <Link href="/admin/approvals" className={`mobile-nav-item ${pathname.startsWith("/admin/approvals") ? "active" : ""}`}>
              <Icons.Shield size={18} />
              <span>Approvals</span>
            </Link>
          )}
          <Link href="/tasks" className={`mobile-nav-item ${pathname.startsWith("/tasks") && !pathname.startsWith("/tasks/new") ? "active" : ""}`}>
            <Icons.ClipboardList size={18} />
            <span>Tasks</span>
          </Link>
          <Link href="/reports/daily" className={`mobile-nav-item ${pathname.startsWith("/reports") ? "active" : ""}`}>
            <Icons.FileText size={18} />
            <span>Reports</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
