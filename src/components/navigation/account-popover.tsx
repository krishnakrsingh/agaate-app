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

function getProfileHref(role: string): string | null {
  switch (role) {
    case "FARM_ADMIN":
      return "/owner/profile";
    case "FARM_OFFICER":
      return "/officer/profile";
    default:
      return null;
  }
}

function getInitials(name: string | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].charAt(0).toUpperCase();
}

export function AccountPopover({
  open,
  onToggle,
  userName,
  userRole,
  anchorRef,
}: {
  open: boolean;
  onToggle: () => void;
  userName?: string;
  userRole: string;
  anchorRef: React.RefObject<HTMLDivElement | null>;
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

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        setSignOutError("Unable to sign out. Please try again.");
        setSigningOut(false);
        return;
      }
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
        <div className="account-popover" ref={popoverRef} role="menu">
          {/* Profile Card Header */}
          <div className="account-popover-header">
            <div className="account-popover-avatar">{initials}</div>
            <div className="account-popover-user-info">
              <span className="account-popover-name">{displayName}</span>
              <span className="account-popover-role">{displayRole}</span>
              {userInfo?.email && (
                <span className="account-popover-email">{userInfo.email}</span>
              )}
            </div>
          </div>

          <div className="account-popover-divider" />

          {/* VIEW Section */}
          <div className="account-popover-section-label">VIEW</div>
          {profileHref ? (
            <Link
              href={profileHref}
              className="account-popover-item"
              onClick={onToggle}
            >
              <Icons.User size={15} />
              <span>My Profile</span>
            </Link>
          ) : (
            <div className="account-popover-item account-popover-item--disabled">
              <Icons.User size={15} />
              <span>My Profile</span>
            </div>
          )}

          <div className="account-popover-divider" />

          {/* ACCOUNT Section */}
          <div className="account-popover-section-label">ACCOUNT</div>
          <div className="account-popover-item account-popover-item--disabled">
            <Icons.Settings size={15} />
            <span>Account Settings</span>
          </div>
          <div className="account-popover-item account-popover-item--disabled">
            <Icons.Key size={15} />
            <span>Security</span>
          </div>

          <div className="account-popover-divider" />

          {/* PREFERENCES Section */}
          <div className="account-popover-section-label">PREFERENCES</div>
          <div className="account-popover-theme-row">
            <ThemeToggle variant="menu-item" />
          </div>

          <div className="account-popover-divider" />

          {/* SESSION Section */}
          <div className="account-popover-section-label">SESSION</div>
          <button
            type="button"
            className="account-popover-item account-popover-signout"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <>
                <Icons.Spinner size={15} className="account-popover-spinner" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <Icons.LogOut size={15} />
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
