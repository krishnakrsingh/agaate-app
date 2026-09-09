import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ClientsDirectory } from "@/components/ops/clients-directory";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Clients" }]} />
          <h1>Access Restricted</h1>
          <p className="error">The clients directory is available to HQ staff.</p>
        </main>
      </>
    );
  }
  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Clients" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow"><span className="eyebrow-dot" />PORTFOLIO • CLIENTS DIRECTORY</div>
            <h1>Clients</h1>
            <p className="muted">Server-paginated portfolio accounts with per-client farm mix and acreage.</p>
          </div>
        </div>
        <ClientsDirectory />
      </main>
    </>
  );
}
