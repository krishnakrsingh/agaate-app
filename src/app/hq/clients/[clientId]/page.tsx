import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Client360 } from "@/components/hq/client-360";

export const dynamic = "force-dynamic";

export default async function HqClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const session = await requireSession();

  if (!hasPermission(session.role, "clients:read")) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Clients", href: "/hq/clients" }, { label: "Client 360" }]} />
          <h1>Access Restricted</h1>
          <p className="error">You do not have permission to access the HQ client view.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs
          items={[{ label: "HQ" }, { label: "Clients", href: "/hq/clients" }, { label: "Client 360" }]}
        />
        <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>Loading client 360…</div>}>
          <Client360 clientId={clientId} />
        </Suspense>
      </main>
    </>
  );
}
