import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { ClientDirectory } from "@/components/hq/client-directory";

export const dynamic = "force-dynamic";

export default async function HqClientsPage() {
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <h1>Access Restricted</h1>
          <p className="error">Only Super Admins can access the client directory.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Clients</h1>
        <Suspense fallback={<div style={{ padding: "48px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading…</div>}>
          <ClientDirectory />
        </Suspense>
      </main>
    </>
  );
}
