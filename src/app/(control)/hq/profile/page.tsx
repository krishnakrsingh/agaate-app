import { requireSession } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { ProfileSettingsConsole } from "@/modules/profile/ui/profile-settings-console";

export const dynamic = "force-dynamic";

export default async function HqProfilePage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  if (!user) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell">
          <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 600, margin: "40px auto" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Profile unavailable</h1>
            <p className="muted" style={{ marginTop: 8 }}>Your account record could not be loaded.</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell" style={{ paddingTop: 24 }}>
        <ProfileSettingsConsole
          initialUser={{
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            active: user.active,
            createdAt: user.createdAt.toISOString(),
          }}
        />
      </main>
    </>
  );
}