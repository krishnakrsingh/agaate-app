import { notFound, redirect } from "next/navigation";
import { requireSession } from "@modules/auth";
import { getEstateCommandCenter } from "@modules/estates";
import { FarmCommandCenter } from "@modules/estates/ui/farm-command-center";
import { Navbar } from "@/components/navigation/navbar";

export const dynamic = "force-dynamic";

export default async function FarmDetailPage({
  params,
}: {
  params: Promise<{ farmId: string }>;
}) {
  const { farmId } = await params;
  const session = await requireSession();

  if (session.role === "SUPER_ADMIN") {
    redirect(`/hq/farms/${farmId}`);
  }

  let data;
  try {
    data = await getEstateCommandCenter({ estateId: farmId, userId: session.userId });
  } catch {
    return notFound();
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <FarmCommandCenter
          farm={data.farm as any}
          role={session.role}
          canManage={data.canManage}
        />
      </main>
    </>
  );
}
