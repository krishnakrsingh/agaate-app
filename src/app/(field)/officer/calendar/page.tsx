import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OfficerCalendarPage() {
  redirect("/officer/day");
}
