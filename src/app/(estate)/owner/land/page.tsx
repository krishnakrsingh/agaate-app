import { requireSession } from "@modules/auth";
import { getOwnerLandData } from "@modules/plots";
import { Navbar } from "@/components/navigation/navbar";
import { PlotsExplorer } from "@modules/plots/ui/plots-explorer";

export const dynamic = "force-dynamic";

export default async function OwnerLandPage() {
  const session = await requireSession();
  const serializedFarms = await getOwnerLandData();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Land &amp; Plots</h1>
        </div>

        <PlotsExplorer farms={serializedFarms as any} />
      </main>
    </>
  );
}
