import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function OwnerProfilePage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const [user, farms] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true },
    }),
    prisma.farm.findMany({
      where: farmWhere,
      select: { id: true, name: true, location: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  if (!user) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "My Profile" }]} />
          <h1>Profile unavailable</h1>
          <p className="muted">Your account record could not be loaded. Contact HQ.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell narrow">
        <Breadcrumbs items={[{ label: "My Profile" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              ESTATE • ACCOUNT
            </div>
            <h1>My Profile</h1>
            <p className="muted">Your login identity and assigned estates. To change contact details or reset passwords, contact HQ.</p>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {[
                { label: "Name", value: user.name },
                { label: "Email (login)", value: user.email },
                { label: "Phone", value: user.phone ?? "—" },
                { label: "Role", value: user.role.replaceAll("_", " ") },
                { label: "Status", value: user.active ? "Active" : "Disabled" },
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

        <div className="card" style={{ padding: 20, marginTop: 16 }}>
          <h2 style={{ fontSize: 15, margin: "0 0 12px" }}>Assigned estates ({farms.length})</h2>
          {farms.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>No farm assigned yet. Contact HQ to get estate access.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {farms.map((f) => (
                <li key={f.id} style={{ marginBottom: 4 }}>
                  {f.name} <span className="muted">• {f.location} • {f.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
