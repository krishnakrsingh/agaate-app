"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icons } from "../icons";
import { ThemeToggle } from "../theme-toggle";

export function ProfileMenu({
  role,
  userName,
}: {
  role: string;
  userName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initials = userName ? userName.trim().charAt(0).toUpperCase() : "U";
  const roleLabel = role.replaceAll("_", " ");

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="profile-menu" ref={ref}>
      <button
        type="button"
        className={`profile-trigger ${open ? "open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="User Account & Preferences"
      >
        <div className="profile-avatar-wrap">
          <span className="profile-avatar">{initials}</span>
          <span className="profile-status-indicator" />
        </div>
        <div className="profile-text-group">
          <span className="profile-display-name">{userName ?? "Console User"}</span>
          <span className="profile-role-tag">{roleLabel}</span>
        </div>
        <Icons.ChevronDown size={13} className={`profile-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="profile-dropdown" role="menu">
          {/* User Profile Card */}
          <div className="profile-dropdown-card">
            <div className="profile-card-avatar">{initials}</div>
            <div className="profile-card-details">
              <strong className="profile-card-name">{userName ?? "Console User"}</strong>
              <span className="profile-card-role">{roleLabel}</span>
              <span className="profile-card-session">
                <span className="live-dot" /> Session Active
              </span>
            </div>
          </div>

          <div className="profile-dropdown-divider" />

          {/* Quick Navigation Links based on role */}
          <div className="profile-dropdown-nav">
            {role === "SUPER_ADMIN" && (
              <Link
                href="/admin/users"
                className="profile-menu-link"
                onClick={() => setOpen(false)}
              >
                <Icons.Users size={14} />
                <span>Team &amp; Access Controls</span>
              </Link>
            )}
            {(role === "SUPER_ADMIN" || role === "FARM_ADMIN") && (
              <Link
                href="/admin/approvals"
                className="profile-menu-link"
                onClick={() => setOpen(false)}
              >
                <Icons.Shield size={14} />
                <span>Governance &amp; Approvals</span>
              </Link>
            )}
            <Link
              href="/reports/daily"
              className="profile-menu-link"
              onClick={() => setOpen(false)}
            >
              <Icons.FileText size={14} />
              <span>Operations Intelligence</span>
            </Link>
          </div>

          <div className="profile-dropdown-divider" />

          {/* Theme Mode Option */}
          <div className="profile-dropdown-section">
            <ThemeToggle variant="menu-item" />
          </div>

          <div className="profile-dropdown-divider" />

          {/* Sign Out CTA */}
          <button type="button" role="menuitem" className="profile-signout-btn" onClick={signOut}>
            <Icons.LogOut size={14} />
            <span>Sign out of console</span>
          </button>
        </div>
      )}
    </div>
  );
}
