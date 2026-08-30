"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icons } from "./icons";
import { LogoutButton } from "./logout-button";

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
  const roleClass = role.toLowerCase();

  return (
    <>
      <div className="announcement-bar">
        <span style={{ opacity: 0.9 }}>Agaate Operations • Multi-Farm Precision Intelligence</span>
        <span style={{ opacity: 0.5, margin: "0 8px" }}>—</span>
        <span style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>Farm command center</span>
      </div>
      <header className="app-navbar">
        <div className="navbar-inner">
          <Link href="/dashboard" className="navbar-brand" style={{ minWidth: 0 }}>
            <div className="brand-icon"><Icons.Sprout size={16} /></div>
            <span style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>AGAATE</span>
          </Link>

          <nav aria-label="Primary" style={{ justifyContent: "center", display: "flex" }}>
            <ul className="navbar-nav" style={{ gap: 4 }}>
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

          <div className="navbar-actions" style={{ gap: 10 }}>
            <span className={`role-badge ${roleClass}`} style={{ display: "none" }} data-desktop-only>
              {roleLabel}
            </span>
            <span className={`role-badge ${roleClass}`} style={{ fontSize: 10, padding: "3px 8px" }}>
              {role.split("_")[0]}
            </span>
            {userName && (
              <div className="user-profile-badge" title={`Signed in as ${userName}`} style={{ maxWidth: 160 }}>
                <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</span>
              </div>
            )}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-label="Open menu"
                style={{
                  width: 36, height: 36, padding: 0, borderRadius: "var(--radius-pill)",
                  background: menuOpen ? "var(--cohere-primary)" : "var(--canvas)",
                  color: menuOpen ? "white" : "var(--ink)",
                  border: "1px solid var(--hairline)",
                }}
              >
                <Icons.Layers size={16} />
              </button>
              {menuOpen && (
                <div
                  onMouseLeave={() => setMenuOpen(false)}
                  style={{
                    position: "absolute", right: 0, top: "calc(100% + 8px)",
                    background: "white", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)",
                    padding: 8, minWidth: 220, boxShadow: "var(--shadow-lg)", zIndex: 50,
                    display: "grid", gap: 2,
                  }}
                >
                  {secondaryLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setMenuOpen(false)}
                      className="nav-link"
                      style={{ justifyContent: "flex-start", width: "100%" }}
                    >
                      <l.icon size={14} />
                      <span>{l.label}</span>
                    </Link>
                  ))}
                  <div style={{ height: 1, background: "var(--hairline)", margin: "6px 0" }} />
                  <div style={{ padding: "6px 12px", display: "grid", gap: 6 }}>
                    <span className={`role-badge ${roleClass}`}>{roleLabel}</span>
                    <div style={{ fontSize: 12, color: "var(--slate-cohere)" }}>{userName}</div>
                  </div>
                  <div style={{ padding: "0 8px" }}><LogoutButton /></div>
                </div>
              )}
            </div>
            <div style={{ display: "inline-flex" }}><LogoutButton /></div>
          </div>
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <div className="mobile-nav-inner">
          <Link href="/dashboard" className={`mobile-nav-item ${pathname === "/dashboard" ? "active" : ""}`}>
            <Icons.Farm size={20} /><span>Home</span>
          </Link>
          {canExecute && (
            <Link href="/officer/day" className={`mobile-nav-item ${pathname.startsWith("/officer/day") ? "active" : ""}`}>
              <Icons.Sun size={20} /><span>My Day</span>
            </Link>
          )}
          {canPlan && !isOfficer && (
            <Link href="/tasks/new" className={`mobile-nav-item ${pathname.startsWith("/tasks/new") ? "active" : ""}`}>
              <Icons.Calendar size={20} /><span>Plan</span>
            </Link>
          )}
          {(isFarmAdmin || isSuperAdmin) && !canExecute && (
            <Link href="/admin/approvals" className={`mobile-nav-item ${pathname.startsWith("/admin/approvals") ? "active" : ""}`}>
              <Icons.Shield size={20} /><span>Approvals</span>
            </Link>
          )}
          <Link href="/tasks" className={`mobile-nav-item ${pathname.startsWith("/tasks") && !pathname.startsWith("/tasks/new") ? "active" : ""}`}>
            <Icons.ClipboardList size={20} /><span>Tasks</span>
          </Link>
          <Link href="/reports/daily" className={`mobile-nav-item ${pathname.startsWith("/reports") ? "active" : ""}`}>
            <Icons.FileText size={20} /><span>Reports</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
