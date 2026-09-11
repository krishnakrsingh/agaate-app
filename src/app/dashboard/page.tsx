import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import OperationsPage from "@/app/operations/page";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  if (session.role === "FARM_ADMIN") {
    redirect("/owner/dashboard");
  }
  if (session.role === "FARM_OFFICER") {
    redirect("/officer/day");
  }
  if (session.role === "AGRONOMIST") {
    redirect("/agronomy/radar");
  }

  // Super Admin lands directly on HQ
  redirect("/hq");
}
