import { redirect } from "next/navigation";
import { getSession, clearSession } from "@modules/auth";
import { prisma } from "@infrastructure/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, active: true },
  });

  if (!user?.active) {
    await clearSession();
    redirect("/login");
  }

  if (user.role === "FARM_ADMIN") {
    redirect("/owner/farms");
  }

  if (user.role === "FARM_OFFICER") {
    redirect("/officer/day");
  }

  if (user.role === "AGRONOMIST") {
    redirect("/agronomy/chat");
  }

  if (user.role === "SUPER_ADMIN" || user.role === "OPERATIONS_MANAGER") {
    redirect("/hq/clients");
  }

  redirect("/operations");
}
