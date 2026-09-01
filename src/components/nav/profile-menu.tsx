"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "../icons";
import { ThemeToggle } from "../theme-toggle";

export function ProfileMenu({
  role,
  userName,
}: {
  role: string;
  userName?: string;
}) {
  const router = useRouter();
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
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="profile-menu" ref={ref}>
      <button
        type="button"
        className="profile-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="profile-avatar" aria-hidden>
          {initials}
        </span>
        <span className="profile-text">
          <span className="profile-name">{userName ?? "User"}</span>
          <span className="profile-role">{roleLabel}</span>
        </span>
        <Icons.ChevronDown size={14} className={`profile-chevron ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-head">
            <div className="profile-dropdown-name">{userName}</div>
            <div className="profile-dropdown-role">{roleLabel}</div>
          </div>

          <div className="profile-dropdown-divider" />

          <div className="profile-dropdown-section">
            <ThemeToggle variant="menu-item" />
          </div>

          <div className="profile-dropdown-divider" />

          <button type="button" role="menuitem" className="profile-signout" onClick={signOut}>
            <Icons.LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
