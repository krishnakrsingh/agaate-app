import { requireSession } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { ROLE_LABELS } from "@/components/navigation/config";

export const dynamic = "force-dynamic";

export default async function HqSecurityPage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  if (!user) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Security" }]} />
          <h1>Security unavailable</h1>
          <p className="muted">Your account record could not be loaded.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell narrow">
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Security</h1>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {[
                { label: "Session", value: "Active" },
                { label: "Email (login)", value: user.email },
                { label: "Role", value: ROLE_LABELS[user.role] ?? user.role.replaceAll("_", " ") },
                { label: "Account status", value: user.active ? "Active" : "Disabled" },
                { label: "Member since", value: user.createdAt.toISOString().slice(0, 10) },
              ].map((r) => (
                <tr key={r.label} style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <td style={{ padding: "8px 0", color: "var(--muted)", width: 140 }}>{r.label}</td>
                  <td style={{ padding: "8px 0" }}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
