import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OwnerCalendarPage() {
  redirect("/owner/operations");
}
