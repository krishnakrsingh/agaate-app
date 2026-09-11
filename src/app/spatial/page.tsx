import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { SpatialConsole } from "@/components/admin/spatial-console";

export const dynamic = "force-dynamic";

export default async function SpatialPage() {
  const session = await requireSession();
  if (session.role === "SUPER_ADMIN") {
    redirect("/hq/map");
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
