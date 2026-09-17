import { redirect } from "next/navigation";
import { requireSession } from "@modules/auth";
import { Navbar } from "@/components/navigation/navbar";
import { SpatialConsole } from "@modules/spatial/ui/spatial-console";

export const dynamic = "force-dynamic";

export default async function SpatialPage() {
  const session = await requireSession();
  if (session.role === "SUPER_ADMIN") {
    redirect("/hq/clients");
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell-gis">
        <SpatialConsole />
      </main>
    </>
  );
}
