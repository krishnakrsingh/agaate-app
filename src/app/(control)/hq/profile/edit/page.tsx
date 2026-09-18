import { requireSession } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { EditProfileForm } from "./form";
import { ROLE_LABELS } from "@/components/navigation/config";
import Link from "next/link";
import { Icons } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function HqProfileEditPage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true },
  });

  if (!user) {
    return (
      <main className="shell narrow">
        <h1>Profile unavailable</h1>
        <p className="muted">Your account record could not be loaded.</p>
      </main>
    );
  }

  return (
    <main className="shell narrow">
      <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
        <Link href="/hq/clients" style={{ color: "var(--muted)", textDecoration: "none" }}>HQ</Link>
        <Icons.ChevronRight size={12} style={{ color: "var(--muted-soft)", flexShrink: 0 }} />
        <Link href="/hq/profile" style={{ color: "var(--muted)", textDecoration: "none" }}>My Profile</Link>
        <Icons.ChevronRight size={12} style={{ color: "var(--muted-soft)", flexShrink: 0 }} />
        <span style={{ color: "var(--ink)", fontWeight: 500 }}>Edit Profile</span>
      </nav>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "16px 0 4px" }}>Edit Profile</h1>
      <p className="subtle" style={{ marginBottom: 24 }}>Update your personal information and contact details.</p>
      <EditProfileForm
        initialName={user.name ?? ""}
        initialPhone={user.phone ?? ""}
        initialEmail={user.email ?? ""}
        roleLabel={ROLE_LABELS[user.role] ?? user.role.replaceAll("_", " ")}
      />
    </main>
  );
}
