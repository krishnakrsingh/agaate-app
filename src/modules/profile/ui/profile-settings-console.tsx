"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS } from "@/components/navigation/config";

export interface ProfileUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  createdAt: string;
}

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].charAt(0).toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function ProfileSettingsConsole({ initialUser }: { initialUser: ProfileUser }) {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<ProfileUser>(initialUser);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(initialUser.name);
  const [editPhone, setEditPhone] = useState(initialUser.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Theme State
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
    setCurrentTheme(saved);
  }, []);

  const handleThemeChange = (next: "light" | "dark") => {
    setCurrentTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("agaate_theme", next);
    } catch {
      // ignore
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);

    const trimmedName = editName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setProfileError("Full Name must be at least 2 characters.");
      setSavingProfile(false);
      return;
    }

    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: editPhone.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update profile.");
      }

      const updated = await res.json();
      const nextUser: ProfileUser = {
        ...user,
        name: updated.name ?? trimmedName,
        phone: updated.phone ?? (editPhone.trim() || null),
      };

      setUser(nextUser);
      setIsEditingProfile(false);
      toast.success("Profile updated successfully.");

      // Notify sidebar and components of real-time update
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("user-profile-updated", { detail: nextUser }));
      }
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to update profile.";
      setProfileError(message);
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEditProfile = () => {
    setEditName(user.name);
    setEditPhone(user.phone ?? "");
    setProfileError(null);
    setIsEditingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      setSavingPassword(false);
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      setSavingPassword(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      setSavingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update password.");
      }

      toast.success("Password updated successfully.");
      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to update password.";
      setPasswordError(message);
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = getInitials(user.name);
  const roleLabel = ROLE_LABELS[user.role] ?? user.role.replaceAll("_", " ");
  const roleClass = `role-badge role-${user.role.toLowerCase().replace("_", "-")}`;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", width: "100%", paddingBottom: 60 }}>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
        <Link href="/hq/clients" style={{ color: "var(--muted)", textDecoration: "none" }}>HQ</Link>
        <Icons.ChevronRight size={12} style={{ color: "var(--muted-soft)", flexShrink: 0 }} />
        <span style={{ color: "var(--ink)", fontWeight: 500 }}>Profile & Settings</span>
      </nav>

      {/* Page Title */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--ink)", letterSpacing: "-0.01em" }}>
          Profile &amp; Settings
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--muted)" }}>
          Manage your personal information, security and preferences.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* ========================================================================= */}
        {/* SECTION 1: PROFILE */}
        {/* ========================================================================= */}
        <section aria-labelledby="section-profile">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <h2 id="section-profile" style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", margin: 0 }}>
                Profile
              </h2>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "2px 0 0" }}>
                Your personal identity and contact details.
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            {/* Identity Hero Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, paddingBottom: 20, borderBottom: "1px solid var(--hairline)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    backgroundColor: "var(--primary)",
                    color: "var(--on-primary)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 20,
                    fontWeight: 700,
                    flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                >
                  {initials}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{user.name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    <span className={roleClass}>{roleLabel}</span>
                    <span className="status-badge active" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--green)" }} />
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {!isEditingProfile && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditingProfile(true)}
                  style={{ borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600 }}
                >
                  <Icons.Edit size={14} />
                  Edit Profile
                </button>
              )}
            </div>

            {/* Profile Content: View vs Edit */}
            {!isEditingProfile ? (
              <div style={{ paddingTop: 20 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 16,
                  }}
                >
                  <div style={{ padding: "12px 14px", backgroundColor: "var(--canvas-soft)", borderRadius: 10, border: "1px solid var(--hairline-soft)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-soft)" }}>
                      Full Name
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>
                      {user.name}
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px", backgroundColor: "var(--canvas-soft)", borderRadius: 10, border: "1px solid var(--hairline-soft)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-soft)" }}>
                      Email (Login)
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>
                      {user.email}
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px", backgroundColor: "var(--canvas-soft)", borderRadius: 10, border: "1px solid var(--hairline-soft)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-soft)" }}>
                      Phone
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: user.phone ? "var(--ink)" : "var(--muted)", marginTop: 4 }}>
                      {user.phone || "Not provided"}
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px", backgroundColor: "var(--canvas-soft)", borderRadius: 10, border: "1px solid var(--hairline-soft)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-soft)" }}>
                      Assigned Role
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>
                      {roleLabel}
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px", backgroundColor: "var(--canvas-soft)", borderRadius: 10, border: "1px solid var(--hairline-soft)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-soft)" }}>
                      Account Status
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>
                      {user.active ? "Active" : "Disabled"}
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px", backgroundColor: "var(--canvas-soft)", borderRadius: 10, border: "1px solid var(--hairline-soft)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-soft)" }}>
                      Member Since
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 4 }}>
                      {formatDate(user.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} style={{ paddingTop: 20 }}>
                {profileError && (
                  <div style={{ padding: "10px 14px", backgroundColor: "var(--red-light)", color: "var(--red)", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                    {profileError}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      maxLength={100}
                      style={{ borderRadius: 8, fontSize: 14 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      className="input-field"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      maxLength={20}
                      style={{ borderRadius: 8, fontSize: 14 }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 6 }}>
                      Email (Read-only)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={user.email}
                      disabled
                      style={{ borderRadius: 8, fontSize: 14, backgroundColor: "var(--canvas-soft)", color: "var(--muted)", cursor: "not-allowed" }}
                    />
                    <span style={{ fontSize: 11, color: "var(--muted-soft)", marginTop: 4, display: "block" }}>
                      Login identifier cannot be edited directly.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 6 }}>
                      Role (Read-only)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={roleLabel}
                      disabled
                      style={{ borderRadius: 8, fontSize: 14, backgroundColor: "var(--canvas-soft)", color: "var(--muted)", cursor: "not-allowed" }}
                    />
                    <span style={{ fontSize: 11, color: "var(--muted-soft)", marginTop: 4, display: "block" }}>
                      Managed via platform RBAC governance.
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid var(--hairline)" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancelEditProfile}
                    disabled={savingProfile}
                    style={{ borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingProfile}
                    style={{ borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600 }}
                  >
                    {savingProfile ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: SECURITY */}
        {/* ========================================================================= */}
        <section aria-labelledby="section-security">
          <div style={{ marginBottom: 12 }}>
            <h2 id="section-security" style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", margin: 0 }}>
              Security
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "2px 0 0" }}>
              Password protection and session security settings.
            </p>
          </div>

          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            {/* Password Row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, paddingBottom: isChangingPassword ? 20 : 0, borderBottom: isChangingPassword ? "1px solid var(--hairline)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    backgroundColor: "var(--surface-strong)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--ink)",
                    flexShrink: 0,
                  }}
                >
                  <Icons.Key size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Password</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                    Your password is securely protected.
                  </div>
                </div>
              </div>

              {!isChangingPassword ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsChangingPassword(true)}
                  style={{ borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600 }}
                >
                  Change Password
                </button>
              ) : null}
            </div>

            {/* Change Password Form */}
            {isChangingPassword && (
              <form onSubmit={handleChangePassword} style={{ paddingTop: 20 }}>
                {passwordError && (
                  <div style={{ padding: "10px 14px", backgroundColor: "var(--red-light)", color: "var(--red)", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div style={{ padding: "10px 14px", backgroundColor: "var(--green-tint)", color: "var(--green-ink)", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                    {passwordSuccess}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
                      Current Password *
                    </label>
                    <input
                      type="password"
                      className="input-field"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      style={{ borderRadius: 8, fontSize: 14 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
                      New Password *
                    </label>
                    <input
                      type="password"
                      className="input-field"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      style={{ borderRadius: 8, fontSize: 14 }}
                    />
                    <span style={{ fontSize: 11, color: "var(--muted-soft)", marginTop: 4, display: "block" }}>
                      Must be at least 8 characters long.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      className="input-field"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      style={{ borderRadius: 8, fontSize: 14 }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordError(null);
                      setPasswordSuccess(null);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    disabled={savingPassword}
                    style={{ borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingPassword}
                    style={{ borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600 }}
                  >
                    {savingPassword ? "Updating…" : "Update Password"}
                  </button>
                </div>
              </form>
            )}

            {/* Authentication Details Sub-card */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--hairline)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-soft)", marginBottom: 12 }}>
                Authentication Information
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                <div style={{ padding: "10px 14px", backgroundColor: "var(--canvas-soft)", borderRadius: 8, border: "1px solid var(--hairline-soft)" }}>
                  <div style={{ fontSize: 11, color: "var(--muted-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Session Status</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--green)" }} />
                    Active (HTTP-only secure cookie)
                  </div>
                </div>
                <div style={{ padding: "10px 14px", backgroundColor: "var(--canvas-soft)", borderRadius: 8, border: "1px solid var(--hairline-soft)" }}>
                  <div style={{ fontSize: 11, color: "var(--muted-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Auth Method</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                    Standard Password Credentials
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: PREFERENCES */}
        {/* ========================================================================= */}
        <section aria-labelledby="section-preferences">
          <div style={{ marginBottom: 12 }}>
            <h2 id="section-preferences" style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", margin: 0 }}>
              Preferences
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "2px 0 0" }}>
              Customize your workspace appearance and interface options.
            </p>
          </div>

          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Appearance</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                  Toggle between light and dark theme modes.
                </div>
              </div>

              {/* Segmented Theme Buttons */}
              <div
                style={{
                  display: "inline-flex",
                  padding: 3,
                  backgroundColor: "var(--surface-strong)",
                  borderRadius: 10,
                  border: "1px solid var(--hairline)",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleThemeChange("light")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: currentTheme === "light" ? "var(--surface-card)" : "transparent",
                    color: currentTheme === "light" ? "var(--ink)" : "var(--muted)",
                    boxShadow: currentTheme === "light" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icons.Sun size={14} />
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange("dark")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: currentTheme === "dark" ? "var(--surface-card)" : "transparent",
                    color: currentTheme === "dark" ? "var(--ink)" : "var(--muted)",
                    boxShadow: currentTheme === "dark" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icons.Moon size={14} />
                  Dark
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
