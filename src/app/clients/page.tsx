import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { UnifiedDirectory } from "@/components/ops/unified-directory";

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
        <Breadcrumbs items={[{ label: "Directory", href: "/directory" }, { label: "Clients" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow"><span className="eyebrow-dot" />PORTFOLIO • CLIENTS DIRECTORY</div>
            <h1>Clients Directory</h1>
            <p className="muted">Server-paginated portfolio accounts with per-client estate counts, acreage, and authorized owner credentials.</p>
          </div>
        </div>
        <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>Loading clients directory…</div>}>
          <UnifiedDirectory initialTab="clients" />
        </Suspense>
      </main>
    </>
  );
}
