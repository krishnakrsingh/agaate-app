import { Suspense } from "react";
import { requireSession } from "@modules/auth";
import { hasPermission } from "@modules/auth";
import { Navbar } from "@/components/navigation/navbar";
import { ClientDirectory } from "@modules/estates/ui/client-directory";

export const dynamic = "force-dynamic";

export default async function HqClientsPage() {
  const session = await requireSession();

  if (!hasPermission(session.permissions, "clients:read")) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <h1>Access Restricted</h1>
          <p className="error">You do not have permission to access the client directory.</p>
        </main>
      </>
    );
  }

  const canWrite = hasPermission(session.permissions, "clients:write");
  const canOnboard = hasPermission(session.permissions, "onboarding:manage");

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Suspense fallback={<div style={{ padding: "48px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading…</div>}>
          <ClientDirectory canWrite={canWrite} canOnboard={canOnboard} />
        </Suspense>
      </main>
    </>
  );
}
