import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { AdminConsole } from "@/components/admin-console";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const session = await requireSession();

  if (session.role === "SUPER_ADMIN") {
    redirect("/hq/people");
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell narrow">
        <Breadcrumbs items={[{ label: "People & Access" }]} />
        <h1>Access Restricted</h1>
        <p className="error">Only Super Admins can manage platform users and permissions.</p>
      </main>
    </>
  );
}
