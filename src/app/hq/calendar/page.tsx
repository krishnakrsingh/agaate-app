import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface PageSearch {
  farmId?: string;
}

export default async function HqCalendarPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearch>;
}) {
  await requireSession();
  const params = searchParams ? await searchParams : {};
  if (params.farmId) {
    redirect(`/hq/farms/${params.farmId}?tab=history`);
  }
  redirect("/hq/farms");
}
