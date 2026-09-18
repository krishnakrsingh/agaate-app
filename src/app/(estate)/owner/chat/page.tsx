import { requireSession, accessibleFarmWhere } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { OwnerChat } from "@modules/chat/ui/owner-chat";

export const dynamic = "force-dynamic";

export default async function OwnerChatPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const farms = await prisma.farm.findMany({
    where: farmWhere,
    select: {
      id: true,
      name: true,
      location: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell" style={{ paddingBottom: 16 }}>
        <OwnerChat currentUserId={session.userId} initialFarms={farms} />
      </main>
    </>
  );
}
