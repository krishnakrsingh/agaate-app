import { requireSession } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { ROLE_LABELS } from "@/components/navigation/config";
import Link from "next/link";
import { Icons } from "@/components/icons";

export const dynamic = "force-dynamic";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].charAt(0).toUpperCase();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

async function loadUser(session: Awaited<ReturnType<typeof requireSession>>) {
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true },
  });
}

export default async function HqProfilePage() {
  const session = await requireSession();
  const user = await loadUser(session);

  if (!user) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "HQ", href: "/hq/clients" }, { label: "My Profile" }]} />
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Profile unavailable</h1>
            <p className="muted" style={{ marginTop: 8 }}>Your account record could not be loaded.</p>
          </div>
        </main>
      </>
    );
  }

  const initials = getInitials(user.name);
  const roleLabel = ROLE_LABELS[user.role] ?? user.role.replaceAll("_", " ");
  const roleClass = `role-badge role-${user.role.toLowerCase().replace("_", "-")}`;

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell narrow">
        {/* Breadcrumb */}
        <Breadcrumbs items={[{ label: "HQ", href: "/hq/clients" }, { label: "My Profile" }]} />

        {/* Profile Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Profile Hero Card */}
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              {/* Avatar */}
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--primary)",
                color: "var(--on-primary)",
                display: "grid",
                placeItems: "center",
                fontSize: 22,
                fontWeight: 700,
                flexShrink: 0,
                border: "2px solid var(--primary)",
              }}>
                {initials}
              </div>

              {/* Info */}
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{user.name}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <span className={roleClass}>{roleLabel}</span>
                  <span className="status-badge active">
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--green)", display: "inline-block" }} />
                    Active
                  </span>
                </div>
              </div>

              {/* Edit Button */}
              <Link href="/hq/profile/edit" className="btn btn-secondary" style={{ flexShrink: 0 }}>
                <Icons.Edit size={16} />
                Edit Profile
              </Link>
            </div>
          </div>

          {/* Personal Information */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Personal Information</h2>
              <p className="subtle" style={{ marginTop: 2 }}>Your contact and account details.</p>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 0,
            }}>
              {[
                { label: "Full Name", value: user.name },
                { label: "Email", value: user.email },
                { label: "Phone", value: user.phone ?? "Not provided" },
                { label: "Role", value: roleLabel },
                { label: "Status", value: user.active ? "Active" : "Disabled" },
                { label: "Member Since", value: formatDate(user.createdAt) },
              ].map((field, i) => (
                <div key={field.label} style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--hairline-soft)",
                  ...(i % 2 === 1 ? { borderLeft: "1px solid var(--hairline-soft)" } : {}),
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-soft)" }}>
                    {field.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginTop: 2 }}>
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account & Security Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {/* Account Settings */}
            <Link href="/hq/settings" className="card" style={{ padding: 20, textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "var(--radius-sm)",
                  background: "var(--surface-strong)", display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  <Icons.Settings size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Account Settings</div>
                  <div className="subtle" style={{ marginTop: 2 }}>Manage your account preferences</div>
                </div>
                <Icons.ChevronRight size={16} style={{ color: "var(--muted-soft)", flexShrink: 0 }} />
              </div>
            </Link>

            {/* Security */}
            <Link href="/hq/security" className="card" style={{ padding: 20, textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "var(--radius-sm)",
                  background: "var(--surface-strong)", display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  <Icons.Key size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Security</div>
                  <div className="subtle" style={{ marginTop: 2 }}>Manage authentication and security settings</div>
                </div>
                <Icons.ChevronRight size={16} style={{ color: "var(--muted-soft)", flexShrink: 0 }} />
              </div>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}