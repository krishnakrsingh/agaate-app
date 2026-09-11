import { redirect } from "next/navigation";
import { getSession, clearSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    redirect("/owner/dashboard");
  }

  if (user.role === "FARM_OFFICER") {
    redirect("/officer/day");
  }

  if (user.role === "AGRONOMIST") {
    redirect("/agronomy/radar");
  }

  redirect("/operations");
}
