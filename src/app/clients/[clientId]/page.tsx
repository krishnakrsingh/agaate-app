import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const session = await requireSession();

  if (session.role === "SUPER_ADMIN") {
    redirect(`/hq/clients/${clientId}`);
  }

  return notFound();
}
