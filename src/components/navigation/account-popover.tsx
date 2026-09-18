"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { ThemeToggle } from "../theme-toggle";
import { ROLE_LABELS } from "@/components/navigation/config";

type UserInfo = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  roleLabel: string;
  active: boolean;
  createdAt: string;
};

function getInitials(name: string | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].charAt(0).toUpperCase();
}

function getProfileHref(role: string): string {
  switch (role) {
    case "FARM_ADMIN":
      return "/owner/profile";
    case "FARM_OFFICER":
      return "/officer/profile";
    case "SUPER_ADMIN":
    case "OPERATIONS_MANAGER":
    default:
      return "/hq/profile";
  }
}

export function AccountPopover({
  open,
  onToggle,
  userName,
  userRole,
  anchorRef,
  isRail = false,
}: {
  open: boolean;
  onToggle: () => void;
  userName?: string;
  userRole: string;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  isRail?: boolean;
}) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadUserInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUserInfo(data);
      }
    } catch {
      // ignore — fallback to props
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onToggle();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onToggle();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchorRef, onToggle]);

  useEffect(() => {
    if (open && !userInfo) {
      loadUserInfo();
    }
  }, [open, userInfo, loadUserInfo]);

  // Listen for real-time user profile updates
  useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ name?: string; phone?: string | null }>;
      if (customEvent.detail) {
        setUserInfo((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            name: customEvent.detail.name ?? prev.name,
            phone: customEvent.detail.phone !== undefined ? customEvent.detail.phone : prev.phone,
          };
        });
      }
    };

    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed.");
      // Full hard navigation ensures session cookie removal and cache reset
      window.location.href = "/login";
    } catch {
      setSignOutError("Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  };

  const displayName = userInfo?.name ?? userName ?? "Console User";
  const displayRole = userInfo?.roleLabel ?? ROLE_LABELS[userRole] ?? userRole.replaceAll("_", " ");
  const initials = getInitials(displayName);
  const profileHref = getProfileHref(userRole);

  return (
    <>
      {open && (
        <div
          className={`account-popover ${isRail ? "account-popover--rail" : ""}`}
          ref={popoverRef}
          role="menu"
          aria-label="User Account Menu"
        >
          {/* USER HEADER */}
          <div className="account-popover-header">
            <div className="account-popover-avatar" aria-hidden="true">{initials}</div>
            <div className="account-popover-user-info">
              <span className="account-popover-name" title={displayName}>{displayName}</span>
              <span className="account-popover-role">{displayRole}</span>
              {userInfo?.email && (
                <span className="account-popover-email" title={userInfo.email}>{userInfo.email}</span>
              )}
            </div>
          </div>

          <div className="account-popover-divider" />

          {/* SINGLE PROFILE & SETTINGS DESTINATION */}
          <Link
            href={profileHref}
            className="account-popover-item"
            onClick={onToggle}
            role="menuitem"
          >
            <Icons.Settings size={16} />
            <span>Profile &amp; Settings</span>
          </Link>

          <div className="account-popover-divider" />

          {/* THEME */}
          <div className="account-popover-theme-row">
            <ThemeToggle variant="menu-item" />
          </div>

          <div className="account-popover-divider" />

          {/* SIGN OUT */}
          <button
            type="button"
            className="account-popover-item account-popover-signout"
            onClick={handleSignOut}
            disabled={signingOut}
            role="menuitem"
          >
            {signingOut ? (
              <>
                <Icons.Spinner size={16} className="account-popover-spinner spin" />
                <span>Signing out…</span>
              </>
            ) : (
              <>
                <Icons.LogOut size={16} />
                <span>Sign out</span>
              </>
            )}
          </button>

          {signOutError && (
            <div className="account-popover-error">{signOutError}</div>
          )}
        </div>
      )}
    </>
  );
}