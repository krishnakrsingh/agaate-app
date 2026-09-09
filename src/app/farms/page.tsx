import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FarmsDirectory } from "@/components/ops/farms-directory";

export const dynamic = "force-dynamic";

export default async function FarmsPage() {
  const session = await requireSession();
  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Farms" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow"><span className="eyebrow-dot" />PORTFOLIO • FARMS DIRECTORY</div>
            <h1>Farms</h1>
            <p className="muted">Faceted server-side search across the whole portfolio, saved views, bulk actions, export. One page loads at a time.</p>
          </div>
        </div>
        <FarmsDirectory />
      </main>
    </>
  );
}
